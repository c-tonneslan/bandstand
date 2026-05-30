import Link from "next/link";

import { DayHeader } from "@/components/DayHeader";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { addDays, dayLabelFromYmd, todayInPhilly } from "@/lib/dates";
import { groupByDate, resolveOccurrences } from "@/lib/schedule";

// Tonight = today's listings + tomorrow's listings as a runner-up.
export default function TonightPage() {
  const today = todayInPhilly();
  const tomorrow = addDays(today, 1);

  const occ = resolveOccurrences({ start: today, end: tomorrow });
  const byDate = groupByDate(occ);
  const todays = byDate.get(today) ?? [];
  const tomorrows = byDate.get(tomorrow) ?? [];

  return (
    <div className="space-y-12">
      <section>
        <p className="font-mono uppercase tracking-widest text-xs text-muted mb-2">
          tonight in philly
        </p>
        <DayHeader date={today} isToday label={`Tonight · ${dayLabelFromYmd(today)}`} />
        {todays.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid gap-3">
            {todays.map((o) => (
              <OccurrenceCard key={o.id} o={o} />
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="font-mono uppercase tracking-widest text-xs text-muted mb-2">tomorrow</p>
        <DayHeader date={tomorrow} label={`${dayLabelFromYmd(tomorrow)}`} />
        {tomorrows.length === 0 ? (
          <Empty next />
        ) : (
          <div className="grid gap-3">
            {tomorrows.map((o) => (
              <OccurrenceCard key={o.id} o={o} />
            ))}
          </div>
        )}
      </section>

      <p className="text-sm text-muted">
        Looking further out?{" "}
        <Link href="/week" className="inline">
          See the next seven days
        </Link>
        .
      </p>
    </div>
  );
}

function Empty({ next }: { next?: boolean }) {
  return (
    <div className="border border-line rounded-md p-6 text-muted text-sm">
      <p>Nothing scheduled in the bandstand index{next ? " for tomorrow" : " for tonight"}.</p>
      <p className="mt-2">
        v0 is hand-curated, so this often means "we don't have it yet" rather than "there's
        nothing on." Check{" "}
        <a className="inline" href="https://www.chrisjazzcafe.com/" target="_blank" rel="noreferrer">
          Chris' Jazz Cafe
        </a>{" "}
        or{" "}
        <a
          className="inline"
          href="https://www.heritagephiladelphia.com/"
          target="_blank"
          rel="noreferrer"
        >
          Heritage
        </a>{" "}
        directly if you're going out.
      </p>
    </div>
  );
}
