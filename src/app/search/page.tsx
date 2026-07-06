import type { Metadata } from "next";

import SearchClient, { type SearchEntry } from "@/components/SearchClient";
import { series } from "@/data/series";
import { venues } from "@/data/venues";
import { addDays, dayLabel, formatHumanDate, todayInPhilly } from "@/lib/dates";
import { resolveOccurrences } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "Search — The Bandstand",
  description:
    "Search Philadelphia jazz venues, shows, and jam sessions across the next 60 days — filtered as you type.",
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Search — The Bandstand",
    description: "Find a Philadelphia jazz room, show, or session. Filtered as you type.",
    url: "/search",
    type: "website",
    siteName: "The Bandstand",
  },
};

// Everything searchable lives in one flat index built at render time: venues,
// the next ~60 days of resolved occurrences, and the recurring series. The
// client does substring matching over each entry's `keywords`.
function buildIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const v of venues) {
    entries.push({
      type: "venue",
      label: v.name,
      sublabel: `${v.neighborhood} · ${v.vibe}`,
      href: `/venues/${v.slug}`,
      keywords: [v.name, v.neighborhood, v.blurb, v.vibe, v.cover].join(" ").toLowerCase(),
    });
  }

  const start = todayInPhilly();
  const end = addDays(start, 60);
  for (const o of resolveOccurrences({ start, end })) {
    entries.push({
      type: "show",
      label: o.name,
      sublabel: `${formatHumanDate(o.date)} · ${o.venue.name}`,
      href: o.ticketUrl ?? `/venues/${o.venue.slug}`,
      keywords: [o.name, o.venue.name, o.venue.neighborhood, ...(o.performers ?? [])]
        .join(" ")
        .toLowerCase(),
    });
  }

  const venueBySlug = new Map(venues.map((v) => [v.slug, v]));
  for (const s of series) {
    const venue = venueBySlug.get(s.venueSlug);
    if (!venue) continue;
    entries.push({
      type: "series",
      label: s.name,
      sublabel: `${dayLabel(s.day)}s · ${venue.name}`,
      href: `/venues/${venue.slug}`,
      keywords: [s.name, venue.name, venue.neighborhood, dayLabel(s.day), s.host ?? ""]
        .join(" ")
        .toLowerCase(),
    });
  }

  return entries;
}

export default function SearchPage() {
  const index = buildIndex();

  return (
    <div>
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-line">
        <div className="md:col-span-9">
          <p className="caps text-muted mb-3">Find a room, a show, a session</p>
          <h1 className="masthead text-[clamp(3.5rem,11vw,8rem)]">Search.</h1>
        </div>
        <div className="md:col-span-3 self-end caps text-muted leading-[1.8]">
          <p>{index.length} things indexed,</p>
          <p>venues + shows + jams,</p>
          <p>filtered as you type.</p>
        </div>
      </header>

      <div className="mt-12 max-w-2xl">
        <SearchClient index={index} />
      </div>
    </div>
  );
}
