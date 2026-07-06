import type { Metadata } from "next";

import { DayHeader } from "@/components/DayHeader";
import JsonLd from "@/components/JsonLd";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { addDays, dayLabelFromYmd, todayInPhilly } from "@/lib/dates";
import { musicEventLd } from "@/lib/jsonld";
import { groupByDate, resolveOccurrences } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "Jams — The Bandstand",
  description:
    "Every recurring open jam session and open mic in Philadelphia jazz over the next two weeks, with the sit-in policy on each.",
  alternates: { canonical: "/sessions" },
  openGraph: {
    title: "Jams — The Bandstand",
    description: "Philadelphia jazz jam sessions for the next two weeks, sit-in policy on each.",
    url: "/sessions",
    type: "website",
    siteName: "The Bandstand",
  },
};

// Jam-sessions-only view across the next two weeks. The goal: a musician
// who wants to sit in somewhere this week can scan this list and walk in.
export default function SessionsPage() {
  const start = todayInPhilly();
  const end = addDays(start, 13);
  const all = resolveOccurrences({ start, end });
  const jams = all.filter((o) => o.kind === "jam" || o.kind === "open-mic");
  const byDate = groupByDate(jams);
  const dates = Array.from(byDate.keys()).sort();

  return (
    <div>
      <JsonLd data={jams.map(musicEventLd)} />
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps mb-3">For musicians + listeners</p>
          <h1 className="masthead text-[clamp(3rem,9vw,6rem)]">
            Jams.
          </h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>Two weeks ahead,</p>
          <p>{jams.length} sessions,</p>
          <p>sit-in policy on each.</p>
        </div>
      </header>

      <p className="deck max-w-3xl mt-8 mb-16">
        Every recurring open session bandstand knows about. The sit-in policy line tells you
        whether to bring your horn, sign up at the door, or just hang and listen.
      </p>

      {dates.length === 0 ? (
        <p className="text-muted">No jam sessions in the index for the next two weeks.</p>
      ) : (
        <div className="space-y-12">
          {dates.map((d) => (
            <section key={d}>
              <DayHeader
                date={d}
                isToday={d === start}
                weekdayChip={dayLabelFromYmd(d).slice(0, 3)}
              />
              <div className="divide-y divide-line">
                {(byDate.get(d) ?? []).map((o) => (
                  <OccurrenceCard key={o.id} o={o} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
