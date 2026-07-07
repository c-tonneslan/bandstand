// The "Just Announced" feed. We keep a committed ledger of when each scraped
// event id first showed up (src/data/first-seen.json, written by the nightly
// refresh) and use it to surface the most-recently-added upcoming shows.

import firstSeen from "@/data/first-seen.json";
import type { Occurrence } from "@/data/types";
import { addDays, todayInPhilly } from "./dates";
import { resolveOccurrences } from "./schedule";

const ledger: Record<string, string> = firstSeen;

// How far ahead we look for upcoming shows. The furthest scraped event sits a
// few months out; a wide window keeps late-announced fall shows in the feed.
const HORIZON_DAYS = 180;

export function firstSeenOf(eventId: string): string | undefined {
  return ledger[eventId];
}

export interface Addition {
  occurrence: Occurrence;
  firstSeen: string; // ISO timestamp the event id first appeared
}

// Upcoming occurrences whose source event was first seen within `days`, newest
// addition first. Event-sourced occurrences carry the raw event id as their
// `id` (schedule.ts), so that id is the join key into the ledger; series
// occurrences have no ledger entry and fall out.
export function recentlyAdded({
  days = 21,
  limit = 40,
}: { days?: number; limit?: number } = {}): Addition[] {
  const start = todayInPhilly();
  const end = addDays(start, HORIZON_DAYS);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const out: Addition[] = [];
  for (const o of resolveOccurrences({ start, end })) {
    if (o.source !== "event") continue;
    const seen = ledger[o.id];
    if (!seen) continue;
    if (new Date(seen).getTime() < cutoff) continue;
    out.push({ occurrence: o, firstSeen: seen });
  }

  out.sort((a, b) => {
    if (a.firstSeen !== b.firstSeen) return b.firstSeen.localeCompare(a.firstSeen);
    return a.occurrence.date.localeCompare(b.occurrence.date);
  });

  return out.slice(0, limit);
}
