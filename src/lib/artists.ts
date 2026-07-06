// Performers index. Built off the explicit `performers` field on occurrences —
// we don't parse names out of free text, so an artist only shows up once a
// curator has tagged a show. Resolves a ~60-day window ahead.

import type { Occurrence } from "@/data/types";
import { addDays, todayInPhilly } from "./dates";
import { resolveOccurrences } from "./schedule";

const WINDOW_DAYS = 60;

export interface Artist {
  slug: string;
  name: string;
  count: number;
}

export function artistSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function upcoming(): Occurrence[] {
  const start = todayInPhilly();
  return resolveOccurrences({ start, end: addDays(start, WINDOW_DAYS) });
}

// One row per performer, alphabetized by name, with an upcoming-show count.
// The first display name we see for a slug wins (names are already clean).
export function listArtists(): Artist[] {
  const bySlug = new Map<string, Artist>();
  for (const o of upcoming()) {
    for (const name of o.performers ?? []) {
      const slug = artistSlug(name);
      if (!slug) continue;
      const existing = bySlug.get(slug);
      if (existing) existing.count += 1;
      else bySlug.set(slug, { slug, name, count: 1 });
    }
  }
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getArtist(slug: string): { name: string; occurrences: Occurrence[] } | null {
  const occurrences = upcoming().filter((o) =>
    (o.performers ?? []).some((n) => artistSlug(n) === slug),
  );
  if (occurrences.length === 0) return null;
  const name = (occurrences[0].performers ?? []).find((n) => artistSlug(n) === slug) ?? slug;
  return { name, occurrences };
}
