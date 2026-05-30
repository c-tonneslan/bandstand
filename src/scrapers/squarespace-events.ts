// Generic scraper for Squarespace "Events" collections. Squarespace exposes
// any collection page as JSON via the `?format=json-pretty` query param, and
// an events collection puts the future shows in `.upcoming[]` and past ones
// in `.past[]`. Dates are milliseconds-since-epoch in venue-local time.
//
// To add a new Squarespace events page, register a SquarespaceVenue entry
// below — slug must match a venue in src/data/venues.ts.

import type { Event } from "@/data/types";
import { FETCH_HEADERS, type Scraper } from "./types";

interface SquarespaceVenue {
  slug: string;
  baseUrl: string;
  eventsPath: string; // usually "/events" but some Squarespace sites use different paths
}

const SOURCES: SquarespaceVenue[] = [
  { slug: "khyber-pass-pub", baseUrl: "https://khyberpasspub.com", eventsPath: "/events" },
];

interface SquarespaceEvent {
  title?: string;
  startDate?: number; // epoch ms
  endDate?: number;
  url?: string | null;
  fullUrl?: string;
  excerpt?: string;
  body?: string;
}

function epochToLocal(ms: number): { date: string; time: string } | null {
  // Squarespace timestamps are venue-local clock projected to UTC. We treat the
  // millisecond timestamp as a Date and read its components in local-ish time,
  // which is fine for events in Philly because our build runs in UTC and we
  // shift to America/New_York. Honest fallback: read UTC components.
  if (!ms || !Number.isFinite(ms)) return null;
  const d = new Date(ms);
  // Format in America/New_York to match the rest of the app's TZ choice.
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const date = dateFmt.format(d); // YYYY-MM-DD
  const t = timeFmt.format(d); // HH:MM
  return { date, time: t.replace(/^24:/, "00:") };
}

function isJamFlavored(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes("jam") || t.includes("open mic");
}

function isDjFlavored(title: string, excerpt: string): boolean {
  const t = (title + " " + excerpt).toLowerCase();
  return (
    t.includes("dj ") ||
    t.includes("djs") ||
    t.includes("vinyl") ||
    t.includes("selectors") ||
    t.includes("cured beats") ||
    t.includes("beats")
  );
}

async function scrapeSource(src: SquarespaceVenue, scrapedAt: string): Promise<{ events: Event[]; warnings: string[] }> {
  const events: Event[] = [];
  const warnings: string[] = [];
  const url = `${src.baseUrl}${src.eventsPath}?format=json-pretty`;
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) {
    warnings.push(`squarespace ${src.slug}: ${res.status} on ${url}`);
    return { events, warnings };
  }
  let json: { upcoming?: SquarespaceEvent[] };
  try {
    json = await res.json();
  } catch {
    warnings.push(`squarespace ${src.slug}: response was not JSON`);
    return { events, warnings };
  }
  const upcoming = json.upcoming ?? [];
  if (upcoming.length === 0) {
    warnings.push(`squarespace ${src.slug}: no upcoming events`);
    return { events, warnings };
  }
  for (const e of upcoming) {
    if (!e.startDate || !e.title) continue;
    const start = epochToLocal(e.startDate);
    const end = e.endDate ? epochToLocal(e.endDate) : null;
    if (!start) {
      warnings.push(`squarespace ${src.slug}: bad startDate on ${e.title}`);
      continue;
    }
    const title = e.title;
    const excerpt = (e.excerpt ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const kind = isJamFlavored(title) ? "jam" : isDjFlavored(title, excerpt) ? "dj" : "ticketed";
    const ticketUrl = e.fullUrl ? `${src.baseUrl}${e.fullUrl}` : undefined;
    const note = excerpt.length > 200 ? `${excerpt.slice(0, 197)}...` : excerpt || undefined;
    const idSlug = (e.fullUrl ?? title).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    events.push({
      id: `sq-${src.slug}-${idSlug}-${start.date}`,
      venueSlug: src.slug,
      date: start.date,
      startTime: start.time,
      endTime: end?.time,
      name: title,
      kind,
      ticketUrl,
      notes: note,
      confidence: "verified",
      verifiedAt: scrapedAt,
    });
  }
  return { events, warnings };
}

export const scrapeSquarespaceEvents: Scraper = async () => {
  const scrapedAt = new Date().toISOString();
  const events: Event[] = [];
  const warnings: string[] = [];
  for (const src of SOURCES) {
    try {
      const r = await scrapeSource(src, scrapedAt);
      events.push(...r.events);
      warnings.push(...r.warnings);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`squarespace ${src.slug}: ${msg}`);
    }
  }
  return { venueSlug: "squarespace", scrapedAt, events, warnings };
};
