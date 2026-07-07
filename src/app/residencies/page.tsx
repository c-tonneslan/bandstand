import type { Metadata } from "next";

import { ResidencyCard } from "@/components/ResidencyCard";
import { residencies } from "@/lib/residency";

export const metadata: Metadata = {
  title: "The Standing Sets — The Bandstand",
  description:
    "Philadelphia's jazz residencies as the marquee — the rooms that hold a night down every week, the host on each, and which sets are counting down to their last.",
  alternates: { canonical: "/residencies" },
  openGraph: {
    title: "The Standing Sets — The Bandstand",
    description: "The recurring residencies that make a scene — the standing sets, room by room.",
    url: "/residencies",
    type: "website",
    siteName: "The Bandstand",
  },
};

// Repertory-style residency view: a recurring series is the headline unit, not a
// grid of dates. Standing sets lead; anything in its final weeks gets flagged.
export default function ResidenciesPage() {
  const all = residencies();
  const standing = all.filter((r) => r.lifecycle === "standing");
  const ending = all.filter((r) => r.lifecycle === "ending-soon");

  return (
    <div>
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps mb-3">The nights that repeat</p>
          <h1 className="masthead text-[clamp(3rem,9vw,6rem)]">The Standing Sets.</h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>{all.length} residencies,</p>
          <p>{standing.length} standing,</p>
          {ending.length > 0 && <p>{ending.length} in final weeks.</p>}
        </div>
      </header>

      <p className="deck max-w-3xl mt-8 mb-16">
        The rooms that hold a night down every week — the standing sets that make a scene. Not a
        calendar to scroll but a bill to read: the slot, the host, and the booker&rsquo;s own line
        on why the night is the way it is.
      </p>

      {all.length === 0 ? (
        <p className="text-muted">
          No standing residencies in the index right now. When a room commits to a weekly night,
          it lands here.
        </p>
      ) : (
        <div className="space-y-16">
          <section>
            <div className="grid md:grid-cols-2 gap-x-10 gap-y-8">
              {standing.map((r) => (
                <ResidencyCard key={r.series.id} r={r} />
              ))}
            </div>
          </section>

          {ending.length > 0 && (
            <section>
              <h2 className="caps text-gold mb-6 border-b border-foreground/30 pb-2">
                Catch them before they go
              </h2>
              <div className="grid md:grid-cols-2 gap-x-10 gap-y-8">
                {ending.map((r) => (
                  <ResidencyCard key={r.series.id} r={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
