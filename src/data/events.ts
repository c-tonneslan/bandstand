import type { Event, Override } from "./types";

// One-off ticketed shows + special nights for venues we don't yet scrape.
// Once a venue has a working scraper (see src/scrapers/), its entries here
// should be deleted so scraped data is the single source of truth.
//
// Confidence rules same as series.ts.
export const events: Event[] = [
  {
    id: "solar-myth-2026-05-31",
    venueSlug: "solar-myth",
    date: "2026-05-31",
    startTime: "20:00",
    endTime: "22:30",
    name: "Ars Nova Workshop presents — see venue calendar",
    kind: "ticketed",
    confidence: "unverified",
    notes: "Programmed by Ars Nova; check the Solar Myth calendar for the headliner.",
  },
];

export const overrides: Override[] = [
  // Use this list to cancel a recurring series for a specific date, e.g. holidays.
];
