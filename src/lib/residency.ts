// Residencies view. Treats a recurring Series as the marquee unit — the room,
// its standing slot, the booker's note, and a lifecycle read derived from the
// data (still standing vs. counting down to its last night). Repertory-cinema
// framing: the series is the headline, not the individual occurrence.

import { series as defaultSeries } from "@/data/series";
import type { DayOfWeek, Series, Venue } from "@/data/types";
import { venues as defaultVenues } from "@/data/venues";
import { addDays, dayLabel, formatHumanDate, formatHumanTime, todayInPhilly } from "./dates";
import { resolveOccurrences } from "./schedule";

// How many days out we look for the next occurrence and the "final weeks" window.
const HORIZON_DAYS = 30;

// A series is standing until it's inside the final-weeks window before its
// announced last night.
export type Lifecycle = "standing" | "ending-soon";

export interface Residency {
  series: Series;
  venue: Venue;
  lifecycle: Lifecycle;
  // "STANDING SET" / "FINAL WEEKS"
  lifecycleLabel: string;
  // "EVERY MONDAY" / "ENDS Tue, Jun 30"
  lifecycleDetail: string;
  // "Every Monday · 9 pm – 12:30 am"
  slot: string;
  // Next date it actually happens, YYYY-MM-DD, if one falls in the horizon.
  nextDate?: string;
}

// Monday-first week — nightlife reads Mon → Sun, not Sun → Sat.
const DAY_ORDER: Record<DayOfWeek, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

function slotString(s: Series): string {
  const start = formatHumanTime(s.startTime);
  const span = s.endTime ? `${start} – ${formatHumanTime(s.endTime)}` : start;
  return `Every ${dayLabel(s.day)} · ${span}`;
}

// Active residencies, each enriched with its venue, next date, slot line, and a
// lifecycle read. Standing sets first, then ordered through the week. Series that
// have already ended are dropped.
export function residencies(now: Date = new Date()): Residency[] {
  const today = todayInPhilly(now);
  const end = addDays(today, HORIZON_DAYS);
  const occ = resolveOccurrences({ start: today, end });
  const venueBySlug = new Map(defaultVenues.map((v) => [v.slug, v]));

  const out: Residency[] = [];
  for (const s of defaultSeries) {
    // Already over — resolver would drop it too; keep the view honest.
    if (s.endedOn && s.endedOn < today) continue;
    const venue = venueBySlug.get(s.venueSlug);
    if (!venue) continue;

    const endingSoon = Boolean(s.endedOn && s.endedOn <= end);
    const lifecycle: Lifecycle = endingSoon ? "ending-soon" : "standing";

    const next = occ.find((o) => o.source === "series" && o.id.startsWith(`${s.id}@`));

    out.push({
      series: s,
      venue,
      lifecycle,
      lifecycleLabel: endingSoon ? "Final weeks" : "Standing set",
      lifecycleDetail: endingSoon
        ? `Ends ${formatHumanDate(s.endedOn as string)}`
        : `Every ${dayLabel(s.day)}`,
      slot: slotString(s),
      nextDate: next?.date,
    });
  }

  out.sort((a, b) => {
    if (a.lifecycle !== b.lifecycle) return a.lifecycle === "standing" ? -1 : 1;
    return DAY_ORDER[a.series.day] - DAY_ORDER[b.series.day];
  });
  return out;
}
