import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { ymdInPhilly, todayInPhilly } from "@/lib/dates";
import { musicEventLd } from "@/lib/jsonld";
import { recentlyAdded } from "@/lib/newness";

export const metadata: Metadata = {
  title: "Just Announced — The Bandstand",
  description:
    "The Philadelphia jazz shows that just hit the board, newest first — a running feed of freshly-added listings.",
  alternates: { canonical: "/new" },
  openGraph: {
    title: "Just Announced — The Bandstand",
    description: "Freshly-added Philadelphia jazz shows, newest first.",
    url: "/new",
    type: "website",
    siteName: "The Bandstand",
  },
};

// Whole days between two YYYY-MM-DD dates (b - a), clamped at zero.
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.max(0, Math.round(ms / 86_400_000));
}

function addedLabel(firstSeen: string, today: string): string {
  const d = daysBetween(ymdInPhilly(new Date(firstSeen)), today);
  return d === 0 ? "Just now" : `Added ${d}d ago`;
}

export default function NewPage() {
  const today = todayInPhilly();
  const additions = recentlyAdded();

  const seenDays = new Set(additions.map((a) => ymdInPhilly(new Date(a.firstSeen))));
  const allSameDay = additions.length > 0 && seenDays.size === 1;

  return (
    <div>
      <JsonLd data={additions.map((a) => musicEventLd(a.occurrence))} />
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps mb-3">The pulse</p>
          <h1 className="masthead text-[clamp(3rem,9vw,6rem)]">
            Just Announced.
          </h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>Newest first,</p>
          <p>{additions.length} fresh,</p>
          <p>straight off the wire.</p>
        </div>
      </header>

      <p className="deck max-w-3xl mt-8 mb-16">
        Fresh ink — the shows that just hit the board.
      </p>

      {additions.length === 0 ? (
        <p className="text-muted text-sm border border-foreground/30 p-6 max-w-2xl">
          Nothing new since the last refresh — check back. The board fills in
          overnight as venues post their calendars.
        </p>
      ) : (
        <>
          {allSameDay && (
            <p className="caps text-muted mb-8 border-l-2 border-accent pl-4 py-1 leading-[1.8]">
              Seeded from the current board. Genuinely new shows will rise to the
              top after the next nightly refresh.
            </p>
          )}
          <div className="divide-y divide-line">
            {additions.map(({ occurrence, firstSeen }) => (
              <div key={occurrence.id}>
                <p className="caps text-accent pt-4">{addedLabel(firstSeen, today)}</p>
                <OccurrenceCard o={occurrence} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
