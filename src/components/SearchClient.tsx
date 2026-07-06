"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const results = useMemo(() => {
    if (tokens.length === 0) return [];
    return index.filter((e) => matches(e, tokens));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, query]);

  // Grouped for display, but the active-row model runs over a single flat
  // order so ↑/↓ traverse every result regardless of section.
  const grouped = useMemo(
    () =>
      GROUPS.map(({ type, heading }) => ({
        type,
        heading,
        items: results.filter((e) => e.type === type),
      })).filter((g) => g.items.length > 0),
    [results],
  );

  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function open(entry: SearchEntry) {
    if (entry.href.startsWith("http")) {
      window.open(entry.href, "_blank", "noreferrer");
    } else {
      router.push(entry.href);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setQuery("");
      return;
    }
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = flat[activeIndex];
      if (entry) open(entry);
    }
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={onKeyDown}
        placeholder="Try a venue, a name, a neighborhood…"
        aria-label="Search venues, shows, and jams"
        role="combobox"
        aria-expanded={flat.length > 0}
        aria-controls="search-results"
        autoFocus
        className="w-full bg-transparent border-b-2 border-foreground font-serif text-2xl md:text-3xl py-3 placeholder:text-muted focus:border-accent transition-[border-color] duration-150"
      />

      <p className="caps text-muted mt-3">↑ ↓ to move · ↵ to open · esc to clear</p>

      {tokens.length === 0 ? (
        <p className="text-muted text-sm mt-8">
          Start typing to search across every venue, upcoming show, and weekly jam in the index.
        </p>
      ) : results.length === 0 ? (
        <p className="text-muted text-sm mt-8 border border-line p-4">
          Nothing matches &ldquo;{query.trim()}.&rdquo; Try a venue name, a neighborhood, or a
          performer.
        </p>
      ) : (
        <div
          id="search-results"
          ref={listRef}
          role="listbox"
          aria-label="Search results"
          className="mt-10 space-y-12"
        >
          {grouped.map(({ type, heading, items }) => {
            // Offset of this group's first item within the flat order.
            const base = flat.indexOf(items[0]);
            return (
              <section key={type}>
                <h2 className="caps text-muted mb-4 border-b border-line pb-2">
                  {heading} · {items.length}
                </h2>
                <div>
                  {items.map((entry, i) => (
                    <ResultRow
                      key={`${entry.href}-${i}`}
                      entry={entry}
                      active={base + i === activeIndex}
                      onHover={() => setActiveIndex(base + i)}
                      onSelect={() => open(entry)}
                    />
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

function ResultRow({
  entry,
  active,
  onHover,
  onSelect,
}: {
  entry: SearchEntry;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const external = entry.href.startsWith("http");
  const inner = (
    <>
      <h3 className="font-serif text-xl md:text-2xl leading-tight">{entry.label}</h3>
      <p className="text-sm text-muted mt-1.5 caps">{entry.sublabel}</p>
    </>
  );
  const className =
    "block py-4 px-3 -mx-3 rounded transition-colors duration-[--dur] " +
    "hover:bg-foreground/[0.04] aria-selected:bg-accent/[0.08] aria-selected:text-accent " +
    "aria-selected:shadow-[inset_2px_0_0_var(--accent)]";

  const shared = {
    className,
    role: "option" as const,
    "aria-selected": active,
    onMouseMove: onHover,
    onClick: onSelect,
  };

  return external ? (
    <a href={entry.href} target="_blank" rel="noreferrer" {...shared}>
      {inner}
    </a>
  ) : (
    <Link href={entry.href} {...shared}>
      {inner}
    </Link>
  );
}
