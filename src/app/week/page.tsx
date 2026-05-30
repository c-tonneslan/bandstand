import { DayHeader } from "@/components/DayHeader";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { addDays, todayInPhilly } from "@/lib/dates";
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

  return (
    <div>
      <p className="font-mono uppercase tracking-widest text-xs text-muted mb-2">
        seven nights ahead
      </p>
      <h1 className="font-serif text-4xl mb-10">This week</h1>
      <div className="space-y-12">
        {days.map(({ date, items }) => (
          <section key={date}>
            <DayHeader date={date} isToday={date === start} />
            {items.length === 0 ? (
              <p className="text-muted text-sm border border-line rounded-md p-4">
                No listings indexed for this date yet.
              </p>
            ) : (
              <div className="grid gap-3">
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
