// One source of truth for the shape of every venue, recurring series, and one-off
// event. The schedule resolver in src/lib/schedule.ts walks these and produces
// Occurrence rows for any date range a page asks for.

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type EventKind =
  | "ticketed" // sit-down concert, you bought a ticket
  | "residency" // recurring weekly band, no cover or small cover
  | "jam" // open jam session, sit-ins welcome
  | "brunch" // weekend jazz brunch
  | "open-mic" // open-mic with jazz focus
  | "dj"; // DJ-driven night, often jazz/soul/funk vinyl

// What kind of room this is. A venue can wear several hats: a vinyl bar can
// also host occasional live, a listening room can run DJ nights, etc.
export type VenueTag =
  | "live-jazz" // hosts live jazz on the regular
  | "jam-session" // known for hosting jams musicians sit in on
  | "listening-room" // seated listening room, silence during sets
  | "vinyl-bar" // records on the system, often selectors curating
  | "dj-set" // DJ-driven jazz / soul / funk nights
  | "jazz-on-system"; // restaurant/bar that plays real jazz, not Spotify slop

export type SitInPolicy =
  | "open" // anyone can sign up
  | "by-invitation" // host calls people up
  | "first-half-then-open" // the band plays a set, then opens it
  | "ask-the-band" // talk to whoever's leading
  | "no-sit-ins";

export type Confidence = "verified" | "likely" | "unverified";

export interface Venue {
  slug: string;
  name: string;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  website?: string;
  instagram?: string;
  // One short editorial line for the venue. No marketing copy.
  blurb: string;
  // What you'd want to know walking in.
  vibe: string;
  // "free" / "cover varies" / "ticketed" / "two-drink minimum" etc.
  cover: string;
  // What this place does, in order of how strongly it's that thing.
  tags: VenueTag[];
}

export interface Series {
  id: string;
  venueSlug: string;
  name: string;
  // Day of week + local clock time. The schedule resolver handles America/New_York.
  day: DayOfWeek;
  startTime: string; // "HH:mm"
  endTime?: string;
  kind: EventKind;
  // Only required when kind === "jam" or "open-mic".
  sitInPolicy?: SitInPolicy;
  host?: string;
  notes?: string;
  // If unverified, the UI shows a "check the venue" badge on every occurrence.
  confidence: Confidence;
  // ISO date the series last got eyeballed against the venue's source.
  verifiedAt?: string;
  // If the series ended, set this and the resolver drops it after this date.
  endedOn?: string;
}

export interface Event {
  id: string;
  venueSlug: string;
  date: string; // "YYYY-MM-DD"
  startTime: string;
  endTime?: string;
  name: string;
  performers?: string[];
  kind: EventKind;
  sitInPolicy?: SitInPolicy;
  ticketUrl?: string;
  ticketPrice?: string;
  notes?: string;
  confidence: Confidence;
  verifiedAt?: string;
}

// Tell the resolver "this date the series is cancelled" or "this date it's a special."
export interface Override {
  seriesId: string;
  date: string;
  // "cancelled" drops the occurrence. "replaced" drops it and the matching
  // Event takes its place (Event with the same venue + date will land instead).
  kind: "cancelled" | "replaced";
  reason?: string;
}

// What the resolver hands back. UI components only ever read this shape.
export interface Occurrence {
  // Stable id so React keys are deterministic across renders.
  id: string;
  venue: Venue;
  date: string; // YYYY-MM-DD in America/New_York
  startTime: string;
  endTime?: string;
  name: string;
  performers?: string[];
  kind: EventKind;
  sitInPolicy?: SitInPolicy;
  ticketUrl?: string;
  ticketPrice?: string;
  notes?: string;
  confidence: Confidence;
  verifiedAt?: string;
  source: "series" | "event";
}
