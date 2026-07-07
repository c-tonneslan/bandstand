import type { Metadata } from "next";

import { DayHeader } from "@/components/DayHeader";
import JsonLd from "@/components/JsonLd";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { addDays, dayLabelFromYmd, todayInPhilly } from "@/lib/dates";
import { musicEventLd } from "@/lib/jsonld";
import { groupByDate, resolveOccurrences } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "This Week — The Bandstand",
  description:
    "Seven nights of Philadelphia jazz: live rooms, jam sessions, listening rooms, and DJ nights, one date at a time.",
  alternates: { canonical: "/week" },
  openGraph: {
    title: "This Week — The Bandstand",
    description: "Where to hear jazz in Philadelphia over the next seven nights.",
    url: "/week",
    type: "website",
    siteName: "The Bandstand",
  },
};

export const dynamic = "force-dynamic";

export default function WeekPage() {
  const start = todayInPhilly();
  const end = addDays(start, 6);
  const occ = resolveOccurrences({ start, end });
  const byDate = groupByDate(occ);

  const days: { date: string; items: typeof occ }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i);
    days.push({ date: d, items: byDate.get(d) ?? [] });
  }

  const total = days.reduce((n, d) => n + d.items.length, 0);

  return (
    <div>
      <JsonLd data={occ.map(musicEventLd)} />
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps mb-3">Week of {dayLabelFromYmd(start).slice(0, 3)} {start.slice(5).replace("-", "/")}</p>
          <h1 className="masthead text-[clamp(3rem,9vw,6rem)]">
            The Week.
          </h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>Seven nights,</p>
          <p>{total} listings,</p>
          <p>one city.</p>
        </div>
      </header>

      <div className="mt-8 space-y-12">
        {days.map(({ date, items }) => (
          <section key={date}>
            <DayHeader
              date={date}
              isToday={date === start}
              weekdayChip={dayLabelFromYmd(date).slice(0, 3)}
            />
            {items.length === 0 ? (
              <p className="text-muted text-sm border border-foreground/30 p-4 mt-4">
                No listings indexed for this date yet.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {items.map((o) => (
                  <OccurrenceCard key={o.id} o={o} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
