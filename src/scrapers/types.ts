import type { Event } from "@/data/types";

export interface ScrapeResult {
  // Which venue this batch belongs to.
  venueSlug: string;
  // ISO timestamp of when the scrape ran.
  scrapedAt: string;
  // Events the scraper produced. All should carry confidence="verified"
  // and verifiedAt=scrapedAt.
  events: Event[];
  // Soft warnings the scraper wants to surface in CI/logs.
  warnings: string[];
}

export type Scraper = () => Promise<ScrapeResult>;

// Standard headers for outbound fetches. UA identifies bandstand so a
// maintainer can find us if anything goes sideways.
export const FETCH_HEADERS: HeadersInit = {
  "User-Agent": "bandstand-scraper/0.1 (+https://github.com/c-tonneslan/bandstand)",
  Accept: "text/html,application/xhtml+xml",
};
