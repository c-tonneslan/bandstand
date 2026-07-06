import type { Metadata } from "next";
import { Suspense } from "react";

import { FilterBar } from "@/components/FilterBar";
import { addDays, todayInPhilly } from "@/lib/dates";
import { resolveOccurrences } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "Browse — The Bandstand",
  description:
    "The whole board: filter six weeks of Philadelphia jazz by neighborhood, kind, sit-in policy, time of night, and price.",
  alternates: { canonical: "/browse" },
  openGraph: {
    title: "Browse — The Bandstand",
    description: "Filter the whole board of Philadelphia jazz by neighborhood, kind, and more.",
    url: "/browse",
    type: "website",
    siteName: "The Bandstand",
  },
};

// Six-week horizon, resolved on the server and handed to the client as plain
// Occurrence rows. The client does all filtering in memory and mirrors the
// active facets into the URL.
const HORIZON_DAYS = 42;

export default function BrowsePage() {
  const start = todayInPhilly();
  const end = addDays(start, HORIZON_DAYS - 1);
  const occ = resolveOccurrences({ start, end });

  return (
    <div>
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-line">
        <div className="md:col-span-9">
          <p className="caps text-muted mb-3">Every room, every night, one filter away</p>
          <h1 className="masthead text-[clamp(3rem,10vw,7rem)]">The Whole Board.</h1>
        </div>
        <div className="md:col-span-3 self-end deck text-muted">
          <p>Six weeks of listings. Narrow it to the night you&rsquo;re actually free.</p>
        </div>
      </header>

      <div className="mt-8">
        <Suspense
          fallback={<p className="text-muted text-sm mt-8">Loading the board…</p>}
        >
          <FilterBar occ={occ} today={start} />
        </Suspense>
      </div>
    </div>
  );
}
