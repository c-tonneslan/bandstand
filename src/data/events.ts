import type { Event, Override } from "./types";

// One-off ticketed shows + special nights for the current week and the next
// few weeks. v0 is hand-curated; the scraper architecture in v0.1 will fill
// this from each venue's own calendar.
//
// Confidence rules same as series.ts.
export const events: Event[] = [
  // Chris' Jazz Cafe — placeholders shaped from typical week, real names redacted
  // until the next refresh pass with verified data.
  {
    id: "chris-2026-05-30",
    venueSlug: "chris-jazz-cafe",
    date: "2026-05-30",
    startTime: "20:00",
    endTime: "22:30",
    name: "Saturday Headliner — see venue calendar",
    kind: "ticketed",
    confidence: "unverified",
    notes: "Two sets. Check the Chris' calendar for tonight's artist before going.",
  },
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
