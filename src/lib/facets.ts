// Facet vocabulary for the Browse view. Kept out of the client component so the
// server page and the client filter agree on the same encodings, labels, and
// derivation rules. Everything here reads an Occurrence and never mutates it.

import type { EventKind, Occurrence, SitInPolicy } from "@/data/types";

// Time-of-night buckets, by local start hour.
export type TimeBand = "early" | "prime" | "late";
// Price-ish, inferred honestly from what we actually know.
export type PriceBand = "free" | "ticketed";

export interface Facets {
  neighborhood: string[];
  kind: EventKind[];
  sitIn: SitInPolicy[];
  time: TimeBand[];
  price: PriceBand[];
}

export const EMPTY_FACETS: Facets = {
  neighborhood: [],
  kind: [],
  sitIn: [],
  time: [],
  price: [],
};

export const KIND_LABEL: Record<EventKind, string> = {
  ticketed: "Ticketed",
  residency: "Residency",
  jam: "Jam",
  brunch: "Brunch",
  "open-mic": "Open mic",
  dj: "DJ set",
};

export const SITIN_LABEL: Record<SitInPolicy, string> = {
  open: "Open signup",
  "by-invitation": "By invitation",
  "first-half-then-open": "Set, then open",
  "ask-the-band": "Ask the band",
  "no-sit-ins": "No sit-ins",
};

export const TIME_LABEL: Record<TimeBand, string> = {
  early: "Early (before 8)",
  prime: "Prime (8–11)",
  late: "Late night (11+)",
};

export const PRICE_LABEL: Record<PriceBand, string> = {
  free: "Free-ish",
  ticketed: "Ticketed",
};

// URL keys. Kept short and stable — these end up in shared links.
export const FACET_KEYS = {
  neighborhood: "hood",
  kind: "kind",
  sitIn: "sit",
  time: "time",
  price: "price",
} as const;

export function timeBand(o: Occurrence): TimeBand {
  const hour = Number(o.startTime.split(":")[0]);
  if (hour < 20) return "early";
  if (hour < 23) return "prime";
  return "late";
}

// Honest price inference. A ticket URL or price, or a ticketed/brunch kind,
// reads as ticketed. Everything else — residencies, jams, DJ nights — we treat
// as free-ish, which matches how these rooms actually work (cover varies, but
// no ticket booth). We never invent a dollar amount.
export function priceBand(o: Occurrence): PriceBand {
  if (o.ticketUrl || o.ticketPrice) return "ticketed";
  if (o.kind === "ticketed" || o.kind === "brunch") return "ticketed";
  return "free";
}

// Distinct, alpha-sorted neighborhoods present in a set of occurrences.
export function neighborhoodsOf(occ: Occurrence[]): string[] {
  return [...new Set(occ.map((o) => o.venue.neighborhood))].sort((a, b) =>
    a.localeCompare(b),
  );
}

// Distinct sit-in policies present, in the canonical order below.
const SITIN_ORDER: SitInPolicy[] = [
  "open",
  "first-half-then-open",
  "ask-the-band",
  "by-invitation",
  "no-sit-ins",
];

export function sitInPoliciesOf(occ: Occurrence[]): SitInPolicy[] {
  const present = new Set(occ.map((o) => o.sitInPolicy).filter(Boolean) as SitInPolicy[]);
  return SITIN_ORDER.filter((p) => present.has(p));
}

const KIND_ORDER: EventKind[] = [
  "ticketed",
  "residency",
  "jam",
  "brunch",
  "open-mic",
  "dj",
];

export function kindsOf(occ: Occurrence[]): EventKind[] {
  const present = new Set(occ.map((o) => o.kind));
  return KIND_ORDER.filter((k) => present.has(k));
}

// Does one occurrence pass a facet selection? Within a facet, values are OR'd;
// across facets they're AND'd. An empty facet imposes no constraint.
export function matchesFacets(o: Occurrence, f: Facets): boolean {
  if (f.neighborhood.length && !f.neighborhood.includes(o.venue.neighborhood)) return false;
  if (f.kind.length && !f.kind.includes(o.kind)) return false;
  if (f.sitIn.length && !(o.sitInPolicy && f.sitIn.includes(o.sitInPolicy))) return false;
  if (f.time.length && !f.time.includes(timeBand(o))) return false;
  if (f.price.length && !f.price.includes(priceBand(o))) return false;
  return true;
}

export function facetCount(f: Facets): number {
  return (
    f.neighborhood.length + f.kind.length + f.sitIn.length + f.time.length + f.price.length
  );
}

// --- URL <-> Facets. Comma-joined values under the short keys above. ---

export function facetsToParams(f: Facets): URLSearchParams {
  const p = new URLSearchParams();
  if (f.neighborhood.length) p.set(FACET_KEYS.neighborhood, f.neighborhood.join(","));
  if (f.kind.length) p.set(FACET_KEYS.kind, f.kind.join(","));
  if (f.sitIn.length) p.set(FACET_KEYS.sitIn, f.sitIn.join(","));
  if (f.time.length) p.set(FACET_KEYS.time, f.time.join(","));
  if (f.price.length) p.set(FACET_KEYS.price, f.price.join(","));
  return p;
}

function splitParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

// Parse from URLSearchParams, validating against the known vocabularies so a
// hand-edited link can't inject junk values into the active facets.
export function facetsFromParams(
  params: URLSearchParams,
  validNeighborhoods: string[],
): Facets {
  const kinds = new Set<string>(KIND_ORDER);
  const sits = new Set<string>(SITIN_ORDER);
  const times = new Set<string>(["early", "prime", "late"]);
  const prices = new Set<string>(["free", "ticketed"]);
  const hoods = new Set(validNeighborhoods);

  return {
    neighborhood: splitParam(params.get(FACET_KEYS.neighborhood)).filter((v) => hoods.has(v)),
    kind: splitParam(params.get(FACET_KEYS.kind)).filter((v) => kinds.has(v)) as EventKind[],
    sitIn: splitParam(params.get(FACET_KEYS.sitIn)).filter((v) => sits.has(v)) as SitInPolicy[],
    time: splitParam(params.get(FACET_KEYS.time)).filter((v) => times.has(v)) as TimeBand[],
    price: splitParam(params.get(FACET_KEYS.price)).filter((v) => prices.has(v)) as PriceBand[],
  };
}
