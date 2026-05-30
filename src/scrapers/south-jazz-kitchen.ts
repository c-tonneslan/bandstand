// Scraper for South Jazz Kitchen. Their /jazz-club/ page lists every upcoming
// run as /event/SLUG/ links. Each event page ships a clean JSON-LD <Event>
// block with startDate, endDate, description, and a `sameAs` ticket URL
// (Tock). Multi-day runs (e.g. "Fri May 29 - Sun May 31") expand to one
// Occurrence per day; showtimes come from the title where they're explicit
// and fall through to "showtimes vary, see venue" otherwise.

import { load } from "cheerio";

import type { Event } from "@/data/types";
import { FETCH_HEADERS, type Scraper } from "./types";

const VENUE_SLUG = "south-jazz-kitchen";
const ROOT = "https://www.southjazzkitchen.com";
const INDEX = `${ROOT}/jazz-club/`;

interface JsonLdEvent {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  sameAs?: string;
}

function isEventBlock(obj: unknown): obj is JsonLdEvent {
  if (!obj || typeof obj !== "object") return false;
  const t = (obj as { "@type"?: unknown })["@type"];
  if (typeof t === "string") return t === "Event";
  if (Array.isArray(t)) return t.includes("Event");
  return false;
}

// "2026-05-29" → "2026-05-29" (no-op, but normalize against partial inputs).
function ymd(s: string): string | null {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function addDays(date: string, n: number): string | null {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + n);
  const out = dt.toISOString().slice(0, 10);
  return out;
}

function rangeOfDates(start: string, end: string): string[] {
  const out: string[] = [];
  let cur: string | null = start;
  for (let i = 0; i < 21 && cur && cur <= end; i++) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

// "Jamaaladeen Tacuma Quartet featuring Tyshawn Sorey | Sat June 13 | 7PM & 9:30PM"
// → { cleanTitle: "Jamaaladeen Tacuma Quartet featuring Tyshawn Sorey",
//     times: ["19:00", "21:30"] }
//
// "Nicole Henry | Fri May 29 - Sun May 31 | Showtimes Vary by Day"
// → { cleanTitle: "Nicole Henry", times: [] }
function parseTitle(raw: string): { cleanTitle: string; times: string[] } {
  const segments = raw.split("|").map((s) => s.trim());
  const cleanTitle = segments[0] ?? raw;
  const last = segments[segments.length - 1] ?? "";
  const timeMatches = last.match(/(\d{1,2})(?::(\d{2}))? ?(AM|PM)/gi);
  if (!timeMatches) return { cleanTitle, times: [] };
  const times = timeMatches
    .map((t) => {
      const m = t.match(/(\d{1,2})(?::(\d{2}))? ?(AM|PM)/i);
      if (!m) return null;
      let h = parseInt(m[1], 10);
      const min = m[2] ? parseInt(m[2], 10) : 0;
      const mer = m[3].toUpperCase();
      if (mer === "PM" && h !== 12) h += 12;
      if (mer === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    })
    .filter((x): x is string => x !== null);
  return { cleanTitle, times };
}

// "19:30" → "7:30pm"
function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const meridiem = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${meridiem}` : `${h12}:${String(m).padStart(2, "0")}${meridiem}`;
}

function bumpClock(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

async function fetchEventUrls(): Promise<string[]> {
  const res = await fetch(INDEX, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`south: index ${res.status}`);
  const $ = load(await res.text());
  const urls = new Set<string>();
  $('a[href^="/event/"]').each((_i, a) => {
    const href = $(a).attr("href");
    if (href) urls.add(href);
  });
  return Array.from(urls).map((p) => `${ROOT}${p}`);
}

function extractJsonLdEvent(html: string): JsonLdEvent | null {
  const $ = load(html);
  const blocks = $('script[type="application/ld+json"]').toArray();
  for (const el of blocks) {
    const raw = $(el).text().trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (Array.isArray(parsed)) {
      for (const it of parsed) if (isEventBlock(it)) return it;
    } else if (isEventBlock(parsed)) {
      return parsed;
    }
  }
  return null;
}

export const scrapeSouthJazzKitchen: Scraper = async () => {
  const scrapedAt = new Date().toISOString();
  const warnings: string[] = [];

  const urls = await fetchEventUrls();
  if (urls.length === 0) {
    warnings.push("south: zero event URLs at /jazz-club/, page structure may have changed");
    return { venueSlug: VENUE_SLUG, scrapedAt, events: [], warnings };
  }

  const events: Event[] = [];

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: FETCH_HEADERS });
      if (!res.ok) {
        warnings.push(`south: ${res.status} on ${url}`);
        continue;
      }
      const html = await res.text();
      const ld = extractJsonLdEvent(html);
      if (!ld) {
        warnings.push(`south: no JSON-LD Event on ${url}`);
        continue;
      }

      const start = ld.startDate ? ymd(ld.startDate) : null;
      const end = ld.endDate ? ymd(ld.endDate) : start;
      if (!start || !end) {
        warnings.push(`south: missing start/end on ${url}`);
        continue;
      }

      const { cleanTitle, times } = parseTitle(ld.name ?? "");
      const dates = rangeOfDates(start, end);
      const ticketUrl = ld.sameAs;
      // Slug from URL path, last non-empty segment.
      const slug = url.split("/").filter(Boolean).pop() ?? cleanTitle.toLowerCase();

      for (const date of dates) {
        const startTime = times[0] ?? "19:00";
        const last = times[times.length - 1] ?? startTime;
        const endTime = bumpClock(last, 90);
        const setsLine =
          times.length > 1 ? `Two sets: ${times.map(to12h).join(", ")}.` : "";
        const varyLine = times.length === 0 ? "Showtimes vary by day, see venue." : "";
        const notes = [setsLine, varyLine].filter(Boolean).join(" ").trim() || undefined;

        events.push({
          id: `south-${slug}-${date}`,
          venueSlug: VENUE_SLUG,
          date,
          startTime,
          endTime,
          name: cleanTitle,
          kind: "ticketed",
          ticketUrl,
          notes,
          confidence: "verified",
          verifiedAt: scrapedAt,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`south: ${url} -> ${msg}`);
    }
  }

  if (events.length === 0) {
    warnings.push("south: zero events parsed across all detail pages");
  }

  return { venueSlug: VENUE_SLUG, scrapedAt, events, warnings };
};
