import { DayHeader } from "@/components/DayHeader";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { addDays, todayInPhilly } from "@/lib/dates";
import { groupByDate, resolveOccurrences } from "@/lib/schedule";

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
      <p className="font-mono uppercase tracking-widest text-xs text-muted mb-2">
        for musicians + listeners
      </p>
      <h1 className="font-serif text-4xl mb-3">Jam sessions</h1>
      <p className="text-muted max-w-2xl mb-10">
        Every recurring open session bandstand knows about, two weeks ahead. The sit-in policy
        line tells you whether to bring your horn, sign up at the door, or just hang and listen.
      </p>
      {dates.length === 0 ? (
        <p className="text-muted">No jam sessions in the index for the next two weeks.</p>
      ) : (
        <div className="space-y-12">
          {dates.map((d) => (
            <section key={d}>
              <DayHeader date={d} isToday={d === start} />
              <div className="grid gap-3">
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
