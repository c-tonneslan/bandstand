"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { DayHeader } from "@/components/DayHeader";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import type { EventKind, Occurrence, SitInPolicy } from "@/data/types";
import { dayLabelFromYmd } from "@/lib/dates";
import {
  EMPTY_FACETS,
  facetCount,
  facetsFromParams,
  facetsToParams,
  KIND_LABEL,
  kindsOf,
  matchesFacets,
  neighborhoodsOf,
  type PriceBand,
  PRICE_LABEL,
  SITIN_LABEL,
  sitInPoliciesOf,
  type TimeBand,
  TIME_LABEL,
  type Facets,
} from "@/lib/facets";

const TIME_BANDS: TimeBand[] = ["early", "prime", "late"];
const PRICE_BANDS: PriceBand[] = ["free", "ticketed"];

export function FilterBar({ occ, today }: { occ: Occurrence[]; today: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // The facet vocabulary is derived from the whole (unfiltered) set so options
  // don't vanish as you narrow.
  const hoods = useMemo(() => neighborhoodsOf(occ), [occ]);
  const kinds = useMemo(() => kindsOf(occ), [occ]);
  const policies = useMemo(() => sitInPoliciesOf(occ), [occ]);

  const active = useMemo(
    () => facetsFromParams(new URLSearchParams(searchParams.toString()), hoods),
    [searchParams, hoods],
  );

  // Write facets back into the URL without a scroll jump or history spam.
  const commit = useCallback(
    (next: Facets) => {
      const qs = facetsToParams(next).toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router],
  );

  const toggle = useCallback(
    <K extends keyof Facets>(key: K, value: Facets[K][number]) => {
      const cur = active[key] as string[];
      const has = cur.includes(value as string);
      const nextVals = has ? cur.filter((v) => v !== value) : [...cur, value as string];
      commit({ ...active, [key]: nextVals } as Facets);
    },
    [active, commit],
  );

  const clearAll = useCallback(() => commit(EMPTY_FACETS), [commit]);

  const filtered = useMemo(() => occ.filter((o) => matchesFacets(o, active)), [occ, active]);

  // Group filtered results by date, preserving the resolver's date order.
  const groups = useMemo(() => {
    const m = new Map<string, Occurrence[]>();
    for (const o of filtered) {
      const arr = m.get(o.date) ?? [];
      arr.push(o);
      m.set(o.date, arr);
    }
    return [...m.entries()];
  }, [filtered]);

  const count = facetCount(active);

  return (
    <div>
      <div className="flex flex-col gap-5 border-y border-line py-6">
        <FacetRow label="Neighborhood">
          {hoods.map((h) => (
            <Chip
              key={h}
              on={active.neighborhood.includes(h)}
              onClick={() => toggle("neighborhood", h)}
            >
              {h}
            </Chip>
          ))}
        </FacetRow>

        <FacetRow label="Kind">
          {kinds.map((k) => (
            <Chip key={k} on={active.kind.includes(k)} onClick={() => toggle("kind", k)}>
              {KIND_LABEL[k]}
            </Chip>
          ))}
        </FacetRow>

        {policies.length > 0 && (
          <FacetRow label="Sit-in">
            {policies.map((p) => (
              <Chip key={p} on={active.sitIn.includes(p)} onClick={() => toggle("sitIn", p)}>
                {SITIN_LABEL[p]}
              </Chip>
            ))}
          </FacetRow>
        )}

        <FacetRow label="Time">
          {TIME_BANDS.map((t) => (
            <Chip key={t} on={active.time.includes(t)} onClick={() => toggle("time", t)}>
              {TIME_LABEL[t]}
            </Chip>
          ))}
        </FacetRow>

        <FacetRow label="Price">
          {PRICE_BANDS.map((p) => (
            <Chip key={p} on={active.price.includes(p)} onClick={() => toggle("price", p)}>
              {PRICE_LABEL[p]}
            </Chip>
          ))}
        </FacetRow>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <span className="caps text-muted tnum">
          {filtered.length} {filtered.length === 1 ? "listing" : "listings"}
        </span>
        {count > 0 && (
          <>
            <span className="text-muted" aria-hidden="true">
              ·
            </span>
            <ActiveChips active={active} onToggle={toggle} />
            <button type="button" onClick={clearAll} className="btn btn-secondary btn-sm">
              Clear all
            </button>
          </>
        )}
      </div>

      <div className="mt-10">
        {groups.length === 0 ? (
          <p className="deck text-muted border border-line p-8 mt-4">
            Nothing on the board fits that. Loosen a filter — the scene&rsquo;s wider than any one
            night.
          </p>
        ) : (
          <div className="space-y-12">
            {groups.map(([date, items]) => (
              <section key={date}>
                <DayHeader
                  date={date}
                  isToday={date === today}
                  weekdayChip={dayLabelFromYmd(date).slice(0, 3)}
                />
                <div className="divide-y divide-line">
                  {items.map((o) => (
                    <OccurrenceCard key={o.id} o={o} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FacetRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid md:grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-2 items-start">
      <span className="caps text-muted md:pt-2.5">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={
        "caps inline-flex items-center min-h-11 px-3 rounded border transition-colors duration-[--dur] " +
        (on
          ? "border-accent text-accent bg-accent/[0.08]"
          : "border-line text-muted hover:border-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

// The active-filter summary: each is a removable chip so a wrong pick is one tap
// to undo.
function ActiveChips({
  active,
  onToggle,
}: {
  active: Facets;
  onToggle: <K extends keyof Facets>(key: K, value: Facets[K][number]) => void;
}) {
  const chips: { key: keyof Facets; value: string; label: string }[] = [];
  for (const h of active.neighborhood) chips.push({ key: "neighborhood", value: h, label: h });
  for (const k of active.kind) chips.push({ key: "kind", value: k, label: KIND_LABEL[k] });
  for (const s of active.sitIn) chips.push({ key: "sitIn", value: s, label: SITIN_LABEL[s] });
  for (const t of active.time) chips.push({ key: "time", value: t, label: TIME_LABEL[t] });
  for (const p of active.price) chips.push({ key: "price", value: p, label: PRICE_LABEL[p] });

  return (
    <>
      {chips.map((c) => (
        <button
          key={`${c.key}:${c.value}`}
          type="button"
          onClick={() =>
            onToggle(
              c.key,
              c.value as EventKind & SitInPolicy & TimeBand & PriceBand & string,
            )
          }
          className="caps inline-flex items-center gap-1.5 min-h-11 px-3 rounded border border-accent text-accent bg-accent/[0.08]"
          aria-label={`Remove filter ${c.label}`}
        >
          {c.label}
          <span aria-hidden="true">×</span>
        </button>
      ))}
    </>
  );
}
