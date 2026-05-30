import { DayHeader } from "@/components/DayHeader";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { addDays, dayLabelFromYmd, todayInPhilly } from "@/lib/dates";
import { groupByDate, resolveOccurrences } from "@/lib/schedule";

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
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps-wide mb-3">Week of {dayLabelFromYmd(start).slice(0, 3)} {start.slice(5).replace("-", "/")}</p>
          <h1 className="font-serif italic text-[12vw] md:text-[8vw] leading-[0.85] tracking-tight">
            The Week.
          </h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>Seven nights,</p>
          <p>{total} listings,</p>
          <p>one city.</p>
        </div>
      </header>

      <div className="mt-12 space-y-14">
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
