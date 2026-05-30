// Aggregator scraper for the Jazz Philadelphia community calendar. They run
// The Events Calendar (tribe-events) WordPress plugin which exposes a clean
// JSON REST endpoint at /wp-json/tribe/events/v1/events. We pull every
// upcoming event, then match each one's reported venue back to our registry
// by fuzzy name. Events whose venue we don't recognize are skipped (we'd
// rather under-report than mis-attribute).

import type { Event } from "@/data/types";
import { venues } from "@/data/venues";
import { FETCH_HEADERS, type Scraper } from "./types";

const ROOT = "https://www.jazzphiladelphia.org";
const VENUE_SLUG = "jazz-philadelphia"; // aggregator slug, used in event IDs

interface TribeEvent {
  id: number;
  title: string;
  description: string;
  url: string;
  start_date: string; // "YYYY-MM-DD HH:MM:SS" local
  end_date: string;
  venue?: { venue?: string };
}

interface TribeResponse {
  events: TribeEvent[];
  total: number;
  total_pages: number;
}

// "Highmark Mann Center for the Performing Arts" → matches "Mann Center..."
// We normalize both sides (lowercase, strip Highmark / The / punctuation) and
// require one to contain the other.
function matchVenueSlug(reported: string): string | null {
  if (!reported) return null;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/highmark/g, "")
      .replace(/\bthe\b/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const r = norm(reported);
  for (const v of venues) {
    const n = norm(v.name);
    if (n.length < 4) continue;
    if (r.includes(n) || n.includes(r)) return v.slug;
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&quot;/g, '"');
}

// Strip HTML tags from a description and trim to a single line.
function plainText(html: string): string {
  return decodeEntities(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "2026-07-22 20:00:00" → { date: "2026-07-22", time: "20:00" }
function splitDateTime(s: string): { date: string; time: string } | null {
  const m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})/);
  if (!m) return null;
  return { date: m[1], time: `${m[2]}:${m[3]}` };
}

async function fetchPage(page: number): Promise<TribeResponse> {
  const url = `${ROOT}/wp-json/tribe/events/v1/events?per_page=50&page=${page}`;
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`jazz-philadelphia: page ${page} ${res.status}`);
  return res.json();
}

export const scrapeJazzPhiladelphia: Scraper = async () => {
  const scrapedAt = new Date().toISOString();
  const warnings: string[] = [];
  const events: Event[] = [];

  let page = 1;
  let totalPages = 1;
  // Cap pagination at 10 pages defensively so a broken upstream doesn't loop.
  while (page <= totalPages && page <= 10) {
    let resp: TribeResponse;
    try {
      resp = await fetchPage(page);
    } catch (err) {
      warnings.push(err instanceof Error ? err.message : String(err));
      break;
    }
    totalPages = resp.total_pages ?? 1;

    for (const e of resp.events) {
      const venueSlug = matchVenueSlug(e.venue?.venue ?? "");
      if (!venueSlug) {
        warnings.push(`unmatched venue "${e.venue?.venue ?? ""}" for "${e.title}"`);
        continue;
      }
      const start = splitDateTime(e.start_date);
      if (!start) {
        warnings.push(`bad start_date on event ${e.id}`);
        continue;
      }
      const end = splitDateTime(e.end_date);
      const title = decodeEntities(e.title);
      const desc = plainText(e.description ?? "");
      const note = desc.length > 200 ? `${desc.slice(0, 197)}...` : desc;

      events.push({
        id: `jp-${e.id}`,
        venueSlug,
        date: start.date,
        startTime: start.time,
        endTime: end?.time,
        name: title,
        kind: "ticketed",
        ticketUrl: e.url,
        notes: note || undefined,
        confidence: "verified",
        verifiedAt: scrapedAt,
      });
    }
    page += 1;
  }

  if (events.length === 0) {
    warnings.push("jazz-philadelphia: zero events matched a registered venue");
  }

  return { venueSlug: VENUE_SLUG, scrapedAt, events, warnings };
};
