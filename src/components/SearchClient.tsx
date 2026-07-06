"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type SearchType = "venue" | "show" | "series";

export interface SearchEntry {
  type: SearchType;
  label: string;
  sublabel: string;
  href: string;
  keywords: string;
}

const GROUPS: { type: SearchType; heading: string }[] = [
  { type: "venue", heading: "Venues" },
  { type: "show", heading: "Shows" },
  { type: "series", heading: "Every week" },
];

// Every space-separated token in the query has to appear somewhere in the
// entry's keywords. Cheap, order-independent, and good enough here.
function matches(entry: SearchEntry, tokens: string[]): boolean {
  return tokens.every((t) => entry.keywords.includes(t));
}

export default function SearchClient({ index }: { index: SearchEntry[] }) {
  const [query, setQuery] = useState("");

  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const results = useMemo(() => {
    if (tokens.length === 0) return [];
    return index.filter((e) => matches(e, tokens));
  }, [index, tokens]);

  const byType = useMemo(() => {
    const m = new Map<SearchType, SearchEntry[]>();
    for (const e of results) {
      const arr = m.get(e.type) ?? [];
      arr.push(e);
      m.set(e.type, arr);
    }
    return m;
  }, [results]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try a venue, a name, a neighborhood…"
        aria-label="Search venues, shows, and jams"
        autoFocus
        className="w-full bg-transparent border-b-2 border-foreground font-serif text-2xl md:text-3xl py-3 outline-none placeholder:text-muted focus:border-red"
      />

      {tokens.length === 0 ? (
        <p className="text-muted text-sm mt-8">
          Start typing to search across every venue, upcoming show, and weekly jam in the index.
        </p>
      ) : results.length === 0 ? (
        <p className="text-muted text-sm mt-8 border border-foreground/30 p-4">
          Nothing matches &ldquo;{query.trim()}.&rdquo; Try a venue name, a neighborhood, or a
          performer.
        </p>
      ) : (
        <div className="mt-10 space-y-12">
          {GROUPS.map(({ type, heading }) => {
            const items = byType.get(type);
            if (!items || items.length === 0) return null;
            return (
              <section key={type}>
                <h2 className="caps text-red mb-4 border-b border-foreground/30 pb-2">
                  {heading} · {items.length}
                </h2>
                <div className="divide-y divide-line">
                  {items.map((e, i) => (
                    <ResultRow key={`${e.href}-${i}`} entry={e} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultRow({ entry }: { entry: SearchEntry }) {
  const external = entry.href.startsWith("http");
  const inner = (
    <>
      <h3 className="font-serif text-xl md:text-2xl leading-tight">{entry.label}</h3>
      <p className="text-sm text-muted mt-1.5 caps-wide" style={{ letterSpacing: "0.18em" }}>
        {entry.sublabel}
      </p>
    </>
  );
  const className = "block py-4 group hover:text-red";

  return external ? (
    <a href={entry.href} target="_blank" rel="noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <Link href={entry.href} className={className}>
      {inner}
    </Link>
  );
}
