import type { Metadata } from "next";

import { MonthGrid } from "@/components/MonthGrid";
import { addDays, todayInPhilly } from "@/lib/dates";
import { resolveOccurrences } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "The Calendar — The Bandstand",
  description:
    "A month-grid calendar of the Philadelphia jazz scene: every night at a glance, colored by how busy the board is.",
  alternates: { canonical: "/calendar" },
  openGraph: {
    title: "The Calendar — The Bandstand",
    description: "The Philadelphia jazz scene, one month at a time.",
    url: "/calendar",
    type: "website",
    siteName: "The Bandstand",
  },
};

// Resolve roughly ten weeks so the grid has at least the current month plus one
// or two ahead to navigate into. MonthGrid caps navigation to what's here.
const HORIZON_DAYS = 70;

export default function CalendarPage() {
  const start = todayInPhilly();
  const end = addDays(start, HORIZON_DAYS - 1);
  const occ = resolveOccurrences({ start, end });

  return (
    <div>
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-line">
        <div className="md:col-span-9">
          <p className="caps text-muted mb-3">The scene, one month at a time</p>
          <h1 className="masthead text-[clamp(3rem,10vw,7rem)]">The Calendar.</h1>
        </div>
        <div className="md:col-span-3 self-end deck text-muted">
          <p>Every night on one grid. The darker the day, the more there is to hear.</p>
        </div>
      </header>

      <div className="mt-10">
        <MonthGrid occ={occ} today={start} />
      </div>
    </div>
  );
}
