// Data-integrity checks over the hand-curated + scraped data. Pure functions
// that take the data as parameters (so tests can feed fixtures) plus a
// convenience wrapper bound to the real imported data. The vitest gate in
// validate.test.ts asserts the real data produces zero errors.

import { events as defaultEvents, overrides as defaultOverrides } from "@/data/events";
import scrapedJson from "@/data/scraped.json";
import { series as defaultSeries } from "@/data/series";
import type {
  Confidence,
  DayOfWeek,
  Event,
  EventKind,
  Override,
  Series,
  SitInPolicy,
  Venue,
  VenueTag,
} from "@/data/types";
import { venues as defaultVenues } from "@/data/venues";

export type Severity = "error" | "warning";

export interface ValidationIssue {
  severity: Severity;
  code: string;
  message: string;
}

export interface ValidateInput {
  venues: Venue[];
  series: Series[];
  events: Event[];
  overrides?: Override[];
  // Flattened scraped events (event.venueSlug is the real venue reference,
  // not the scraped.json byVenue key which is a scraper-source name).
  scrapedEvents?: Event[];
}

const DAYS: ReadonlySet<DayOfWeek> = new Set<DayOfWeek>([
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
]);

const KINDS: ReadonlySet<EventKind> = new Set<EventKind>([
  "ticketed",
  "residency",
  "jam",
  "brunch",
  "open-mic",
  "dj",
]);

const TAGS: ReadonlySet<VenueTag> = new Set<VenueTag>([
  "live-jazz",
  "jam-session",
  "listening-room",
  "vinyl-bar",
  "dj-set",
  "jazz-on-system",
]);

const SIT_IN: ReadonlySet<SitInPolicy> = new Set<SitInPolicy>([
  "open",
  "by-invitation",
  "first-half-then-open",
  "ask-the-band",
  "no-sit-ins",
]);

const CONFIDENCE: ReadonlySet<Confidence> = new Set<Confidence>([
  "verified",
  "likely",
  "unverified",
]);

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm, 00:00–23:59
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

// Philly metro bounding box. Outside these = warning, not hard error.
const PHILLY_LAT = { min: 39.7, max: 40.2 };
const PHILLY_LNG = { min: -75.6, max: -74.9 };

function err(code: string, message: string): ValidationIssue {
  return { severity: "error", code, message };
}

function warn(code: string, message: string): ValidationIssue {
  return { severity: "warning", code, message };
}

function checkDuplicates<T>(
  items: T[],
  key: (item: T) => string,
  code: string,
  label: string,
): ValidationIssue[] {
  const seen = new Set<string>();
  const reported = new Set<string>();
  const issues: ValidationIssue[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k) && !reported.has(k)) {
      issues.push(err(code, `duplicate ${label}: "${k}"`));
      reported.add(k);
    }
    seen.add(k);
  }
  return issues;
}

export function validateData(input: ValidateInput): ValidationIssue[] {
  const { venues, series, events } = input;
  const overrides = input.overrides ?? [];
  const scrapedEvents = input.scrapedEvents ?? [];
  const issues: ValidationIssue[] = [];

  // -- uniqueness --------------------------------------------------------
  issues.push(
    ...checkDuplicates(venues, (v) => v.slug, "venue-slug-duplicate", "venue slug"),
  );
  issues.push(...checkDuplicates(series, (s) => s.id, "series-id-duplicate", "series id"));
  issues.push(...checkDuplicates(events, (e) => e.id, "event-id-duplicate", "event id"));

  const venueSlugs = new Set(venues.map((v) => v.slug));
  const seriesIds = new Set(series.map((s) => s.id));

  // -- venues ------------------------------------------------------------
  for (const v of venues) {
    for (const tag of v.tags) {
      if (!TAGS.has(tag)) {
        issues.push(err("venue-tag-invalid", `venue "${v.slug}" has invalid tag "${tag}"`));
      }
    }
    if (v.tags.length === 0) {
      issues.push(warn("venue-tags-empty", `venue "${v.slug}" has no tags`));
    }
    // Hard bounds first, then a softer Philly-region warning.
    if (v.lat < -90 || v.lat > 90) {
      issues.push(err("venue-lat-range", `venue "${v.slug}" lat ${v.lat} is out of [-90,90]`));
    } else if (v.lat < PHILLY_LAT.min || v.lat > PHILLY_LAT.max) {
      issues.push(
        warn("venue-lat-region", `venue "${v.slug}" lat ${v.lat} looks outside Philadelphia`),
      );
    }
    if (v.lng < -180 || v.lng > 180) {
      issues.push(err("venue-lng-range", `venue "${v.slug}" lng ${v.lng} is out of [-180,180]`));
    } else if (v.lng < PHILLY_LNG.min || v.lng > PHILLY_LNG.max) {
      issues.push(
        warn("venue-lng-region", `venue "${v.slug}" lng ${v.lng} looks outside Philadelphia`),
      );
    }
  }

  // -- series ------------------------------------------------------------
  for (const s of series) {
    if (!venueSlugs.has(s.venueSlug)) {
      issues.push(
        err(
          "series-venue-missing",
          `series "${s.id}" references unknown venue "${s.venueSlug}"`,
        ),
      );
    }
    if (!DAYS.has(s.day)) {
      issues.push(err("series-day-invalid", `series "${s.id}" has invalid day "${s.day}"`));
    }
    if (!KINDS.has(s.kind)) {
      issues.push(err("series-kind-invalid", `series "${s.id}" has invalid kind "${s.kind}"`));
    }
    if (!CONFIDENCE.has(s.confidence)) {
      issues.push(
        err("series-confidence-invalid", `series "${s.id}" has invalid confidence "${s.confidence}"`),
      );
    }
    if (s.sitInPolicy !== undefined && !SIT_IN.has(s.sitInPolicy)) {
      issues.push(
        err("series-sitin-invalid", `series "${s.id}" has invalid sitInPolicy "${s.sitInPolicy}"`),
      );
    }
    if (!TIME_RE.test(s.startTime)) {
      issues.push(
        err("series-starttime-format", `series "${s.id}" startTime "${s.startTime}" is not HH:mm`),
      );
    }
    if (s.endTime !== undefined && !TIME_RE.test(s.endTime)) {
      issues.push(
        err("series-endtime-format", `series "${s.id}" endTime "${s.endTime}" is not HH:mm`),
      );
    }
    if (s.verifiedAt !== undefined && !DATE_RE.test(s.verifiedAt)) {
      issues.push(
        err("series-verifiedat-format", `series "${s.id}" verifiedAt "${s.verifiedAt}" is not YYYY-MM-DD`),
      );
    }
    if (s.endedOn !== undefined && !DATE_RE.test(s.endedOn)) {
      issues.push(
        err("series-endedon-format", `series "${s.id}" endedOn "${s.endedOn}" is not YYYY-MM-DD`),
      );
    }
  }

  // -- events (hand-curated + scraped share the shape) -------------------
  const allEvents: { list: Event[]; origin: string }[] = [
    { list: events, origin: "event" },
    { list: scrapedEvents, origin: "scraped event" },
  ];
  for (const { list, origin } of allEvents) {
    for (const e of list) {
      if (!venueSlugs.has(e.venueSlug)) {
        issues.push(
          err("event-venue-missing", `${origin} "${e.id}" references unknown venue "${e.venueSlug}"`),
        );
      }
      if (!KINDS.has(e.kind)) {
        issues.push(err("event-kind-invalid", `${origin} "${e.id}" has invalid kind "${e.kind}"`));
      }
      if (!CONFIDENCE.has(e.confidence)) {
        issues.push(
          err("event-confidence-invalid", `${origin} "${e.id}" has invalid confidence "${e.confidence}"`),
        );
      }
      if (e.sitInPolicy !== undefined && !SIT_IN.has(e.sitInPolicy)) {
        issues.push(
          err("event-sitin-invalid", `${origin} "${e.id}" has invalid sitInPolicy "${e.sitInPolicy}"`),
        );
      }
      if (!DATE_RE.test(e.date)) {
        issues.push(err("event-date-format", `${origin} "${e.id}" date "${e.date}" is not YYYY-MM-DD`));
      }
      if (!TIME_RE.test(e.startTime)) {
        issues.push(
          err("event-starttime-format", `${origin} "${e.id}" startTime "${e.startTime}" is not HH:mm`),
        );
      }
      if (e.endTime !== undefined && !TIME_RE.test(e.endTime)) {
        issues.push(
          err("event-endtime-format", `${origin} "${e.id}" endTime "${e.endTime}" is not HH:mm`),
        );
      }
      if (e.verifiedAt !== undefined && !DATE_RE.test(e.verifiedAt)) {
        // Scraped verifiedAt is an ISO timestamp; accept both a bare date and
        // a timestamp that starts with one.
        if (!DATE_RE.test(e.verifiedAt.slice(0, 10))) {
          issues.push(
            err("event-verifiedat-format", `${origin} "${e.id}" verifiedAt "${e.verifiedAt}" is not a date`),
          );
        }
      }
    }
  }

  // -- overrides ---------------------------------------------------------
  for (const o of overrides) {
    if (!seriesIds.has(o.seriesId)) {
      issues.push(
        err("override-series-missing", `override references unknown series "${o.seriesId}"`),
      );
    }
    if (!DATE_RE.test(o.date)) {
      issues.push(err("override-date-format", `override date "${o.date}" is not YYYY-MM-DD`));
    }
    if (o.kind !== "cancelled" && o.kind !== "replaced") {
      issues.push(err("override-kind-invalid", `override has invalid kind "${o.kind}"`));
    }
  }

  return issues;
}

interface ScrapedFile {
  byVenue: Record<string, { events: Event[] }>;
}

// Flatten scraped.json into a plain Event[] on the real venueSlug reference.
export function scrapedEventsFromFile(): Event[] {
  const file = scrapedJson as ScrapedFile;
  return Object.values(file.byVenue).flatMap((b) => b.events);
}

// Convenience wrapper bound to the real committed data.
export function validateRealData(): ValidationIssue[] {
  return validateData({
    venues: defaultVenues,
    series: defaultSeries,
    events: defaultEvents,
    overrides: defaultOverrides,
    scrapedEvents: scrapedEventsFromFile(),
  });
}
