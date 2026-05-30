// Date math for America/New_York. We never use UTC math directly because
// "today in Philly" doesn't match "today in UTC" between midnight and ~5am,
// which is exactly when a jam-session listing matters most.

import type { DayOfWeek } from "@/data/types";

export const PHILLY_TZ = "America/New_York";

const DAY_NAMES: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Build a YYYY-MM-DD string for a Date interpreted in America/New_York.
export function ymdInPhilly(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHILLY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA gives YYYY-MM-DD natively.
  return fmt.format(d);
}

// What day of the week is a YYYY-MM-DD date in Philly?
export function dayOfWeekInPhilly(ymd: string): DayOfWeek {
  // Interpret the date at noon Philly to avoid DST edge cases.
  const [y, m, d] = ymd.split("-").map(Number);
  // Construct a Date at noon UTC, then read its weekday in Philly.
  const at = new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: PHILLY_TZ,
    weekday: "short",
  })
    .format(at)
    .toLowerCase();
  const map: Record<string, DayOfWeek> = {
    sun: "sun",
    mon: "mon",
    tue: "tue",
    wed: "wed",
    thu: "thu",
    fri: "fri",
    sat: "sat",
  };
  return map[wd] ?? "sun";
}

// today / tomorrow / nth-day-from-today in Philly, as YYYY-MM-DD.
export function todayInPhilly(now: Date = new Date()): string {
  return ymdInPhilly(now);
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return ymdInPhilly(dt);
}

// Inclusive range. start and end are both YYYY-MM-DD.
export function rangeOfDays(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  // small safety cap so a typo can't loop forever
  for (let i = 0; i < 366; i++) {
    out.push(cur);
    if (cur === end) return out;
    cur = addDays(cur, 1);
  }
  return out;
}

// "Wed, May 29"
export function formatHumanDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHILLY_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dt);
}

// "9:30 pm" from "21:30"
export function formatHumanTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(Date.UTC(2024, 0, 1, h, m));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  })
    .format(d)
    .toLowerCase()
    .replace(":00", "");
}

export function dayLabel(d: DayOfWeek): string {
  return {
    sun: "Sunday",
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
  }[d];
}

// Used by tests + the resolver. Exported in case a page wants to title-case
// a day from a YYYY-MM-DD without going through dayOfWeekInPhilly twice.
export function dayLabelFromYmd(ymd: string): string {
  return dayLabel(dayOfWeekInPhilly(ymd));
}

export function _internal_dayNames(): DayOfWeek[] {
  return DAY_NAMES.slice();
}
