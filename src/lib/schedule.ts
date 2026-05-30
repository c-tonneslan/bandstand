// The resolver. Walks a date range, expands every Series into Occurrence rows
// for matching weekdays, applies Overrides, drops in the one-off Events, and
// sorts by date + start time. Pages call this and render the result.

import { events as defaultEvents, overrides as defaultOverrides } from "@/data/events";
import { series as defaultSeries } from "@/data/series";
import type { Event, Occurrence, Override, Series } from "@/data/types";
import { venues as defaultVenues } from "@/data/venues";
import { dayOfWeekInPhilly, rangeOfDays } from "./dates";

interface ResolveInput {
  start: string;
  end: string;
  series?: Series[];
  events?: Event[];
  overrides?: Override[];
  venues?: typeof defaultVenues;
}

export function resolveOccurrences(input: ResolveInput): Occurrence[] {
  const series = input.series ?? defaultSeries;
  const events = input.events ?? defaultEvents;
  const overrides = input.overrides ?? defaultOverrides;
  const venues = input.venues ?? defaultVenues;
  const venueBySlug = new Map(venues.map((v) => [v.slug, v]));

  const out: Occurrence[] = [];
  const days = rangeOfDays(input.start, input.end);

  // Quick lookup of overrides keyed by seriesId + date.
  const overrideKey = (sid: string, date: string) => `${sid}@${date}`;
  const overrideMap = new Map(overrides.map((o) => [overrideKey(o.seriesId, o.date), o]));

  for (const s of series) {
    const venue = venueBySlug.get(s.venueSlug);
    if (!venue) continue;
    for (const date of days) {
      if (s.endedOn && date > s.endedOn) continue;
      if (dayOfWeekInPhilly(date) !== s.day) continue;
      const ov = overrideMap.get(overrideKey(s.id, date));
      if (ov && (ov.kind === "cancelled" || ov.kind === "replaced")) continue;
      out.push({
        id: `${s.id}@${date}`,
        venue,
        date,
        startTime: s.startTime,
        endTime: s.endTime,
        name: s.name,
        kind: s.kind,
        sitInPolicy: s.sitInPolicy,
        notes: s.notes,
        confidence: s.confidence,
        verifiedAt: s.verifiedAt,
        source: "series",
      });
    }
  }

  for (const e of events) {
    if (e.date < input.start || e.date > input.end) continue;
    const venue = venueBySlug.get(e.venueSlug);
    if (!venue) continue;
    out.push({
      id: e.id,
      venue,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      name: e.name,
      performers: e.performers,
      kind: e.kind,
      sitInPolicy: e.sitInPolicy,
      ticketUrl: e.ticketUrl,
      ticketPrice: e.ticketPrice,
      notes: e.notes,
      confidence: e.confidence,
      verifiedAt: e.verifiedAt,
      source: "event",
    });
  }

  out.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });
  return out;
}

export function groupByDate(occ: Occurrence[]): Map<string, Occurrence[]> {
  const m = new Map<string, Occurrence[]>();
  for (const o of occ) {
    const arr = m.get(o.date) ?? [];
    arr.push(o);
    m.set(o.date, arr);
  }
  return m;
}
