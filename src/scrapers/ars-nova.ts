// Ars Nova Workshop programs Solar Myth + FringeArts + Christ Church
// Neighborhood House + a few other rooms. Their /whats-on/ page lists every
// program; each program lives at /programs/SLUG/ with the venue and date in
// HTML markup + the og:description meta tag. We pull the list, fetch each
// detail page, regex out venue + date + start time, and only keep events
// whose venue we have in the registry.

import { load } from "cheerio";

import type { Event } from "@/data/types";
import { venues } from "@/data/venues";
import { FETCH_HEADERS, type Scraper } from "./types";

const VENUE_SLUG = "ars-nova";
const ROOT = "https://www.arsnovaworkshop.org";
const INDEX = `${ROOT}/whats-on/`;

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

// "Friday, June 12, 2026" → "2026-06-12"
function parseLongDate(raw: string): string | null {
  const m = raw.match(/(?:\w+,\s*)?(\w+)\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const day = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// "8PM" → "20:00", "7:30 PM" → "19:30"
function parseTime(raw: string): string | null {
  const m = raw.match(/(\d{1,2})(?::(\d{2}))? ?(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
  if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function matchVenueSlug(reported: string): string | null {
  if (!reported) return null;
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const r = norm(reported);
  for (const v of venues) {
    const n = norm(v.name);
    if (n.length < 4) continue;
    if (r === n || r.includes(n) || n.includes(r)) return v.slug;
  }
  return null;
}

async function fetchProgramUrls(): Promise<string[]> {
  const res = await fetch(INDEX, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`ars-nova: index ${res.status}`);
  const html = await res.text();
  const $ = load(html);
  const urls = new Set<string>();
  $('a[href*="/programs/"]').each((_i, a) => {
    const href = $(a).attr("href") ?? "";
    if (href.includes("/programs/") && !href.endsWith("/programs/")) {
      urls.add(href.startsWith("http") ? href : `${ROOT}${href}`);
    }
  });
  return Array.from(urls);
}

interface ProgramInfo {
  title: string;
  date: string | null;
  startTime: string | null;
  venueName: string | null;
  description: string;
}

function parseProgramPage(html: string): ProgramInfo | null {
  const $ = load(html);

  const ogTitle = $('meta[property="og:title"]').attr("content") ?? "";
  // og:title is "Artist - Ars Nova Workshop"
  const title = ogTitle.replace(/\s*-\s*Ars Nova Workshop\s*$/i, "").trim();

  const ogDesc = $('meta[property="og:description"]').attr("content") ?? "";
  // og:description = "Ars Nova Workshop welcomes ... at VENUE on Friday, Month DD, YYYY."
  let venueName: string | null = null;
  let date: string | null = null;
  const m = ogDesc.match(/at\s+([\w\s]+?)\s+on\s+(?:\w+,\s*)?(\w+\s+\d{1,2},\s*\d{4})/i);
  if (m) {
    venueName = m[1].trim();
    date = parseLongDate(m[2]);
  }

  // Start time comes from the date block on the page. It's usually rendered as
  // bare text like "8PM" inside a div near the date.
  let startTime: string | null = null;
  const bodyText = $("body").text();
  const timeMatch = bodyText.match(/\b(\d{1,2}(?::\d{2})? ?(?:PM|AM))\b/);
  if (timeMatch) startTime = parseTime(timeMatch[1]);

  return { title, date, startTime, venueName, description: ogDesc };
}

function bumpClock(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export const scrapeArsNova: Scraper = async () => {
  const scrapedAt = new Date().toISOString();
  const warnings: string[] = [];
  const events: Event[] = [];

  const urls = await fetchProgramUrls();
  if (urls.length === 0) {
    warnings.push("ars-nova: zero program URLs at /whats-on/");
    return { venueSlug: VENUE_SLUG, scrapedAt, events, warnings };
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: FETCH_HEADERS });
      if (!res.ok) {
        warnings.push(`ars-nova: ${res.status} on ${url}`);
        continue;
      }
      const html = await res.text();
      const info = parseProgramPage(html);
      if (!info) continue;
      if (!info.date) {
        warnings.push(`ars-nova: no date parsed for ${url}`);
        continue;
      }
      const venueSlug = matchVenueSlug(info.venueName ?? "");
      if (!venueSlug) {
        warnings.push(`ars-nova: venue "${info.venueName}" not in registry (${info.title})`);
        continue;
      }
      const slug = url.split("/").filter(Boolean).pop() ?? info.title;
      const start = info.startTime ?? "20:00";
      const end = bumpClock(start, 120);
      const note = info.description.length > 220
        ? `${info.description.slice(0, 217)}...`
        : info.description;
      events.push({
        id: `an-${slug}-${info.date}`,
        venueSlug,
        date: info.date,
        startTime: start,
        endTime: end,
        name: info.title,
        kind: "ticketed",
        ticketUrl: url,
        notes: note || undefined,
        confidence: "verified",
        verifiedAt: scrapedAt,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`ars-nova: ${url} -> ${msg}`);
    }
  }

  if (events.length === 0) {
    warnings.push("ars-nova: zero events matched a registered venue");
  }

  return { venueSlug: VENUE_SLUG, scrapedAt, events, warnings };
};
