import Link from "next/link";

import { DayHeader } from "@/components/DayHeader";
import { Featured } from "@/components/Featured";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { series } from "@/data/series";
import { venues } from "@/data/venues";
import { addDays, dayLabelFromYmd, todayInPhilly } from "@/lib/dates";
import { groupByDate, resolveOccurrences } from "@/lib/schedule";

const DAY_FULL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const SERIES_LABEL: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export default function TonightPage() {
  const today = todayInPhilly();
  const tomorrow = addDays(today, 1);

  const occ = resolveOccurrences({ start: today, end: tomorrow });
  const byDate = groupByDate(occ);
  const todays = byDate.get(today) ?? [];
  const tomorrows = byDate.get(tomorrow) ?? [];

  // Centerpiece pick: prefer a verified ticketed show, else the first thing
  // on the docket. If there is genuinely nothing tonight we skip the section.
  const featured =
    todays.find((o) => o.confidence === "verified" && o.kind === "ticketed") ?? todays[0];

  return (
    <div className="space-y-2">
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps-wide mb-3">{dayLabelFromYmd(today)}</p>
          <h1 className="font-serif italic text-[13vw] md:text-[8vw] leading-[0.85] tracking-tight">
            Tonight.
          </h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>{todays.length} listings tonight,</p>
          <p>{tomorrows.length} on deck,</p>
          <p>21 rooms indexed.</p>
        </div>
      </header>

      {featured && <Featured o={featured} />}

      <section className="pt-10">
        <DayHeader
          date={today}
          isToday
          weekdayChip={SERIES_LABEL[dayLabelFromYmd(today).slice(0, 3).toLowerCase()]}
          label="The full slate"
        />
        {todays.length === 0 ? (
          <Empty />
        ) : (
          <div className="divide-y divide-line">
            {todays.map((o) => (
              <OccurrenceCard key={o.id} o={o} />
            ))}
          </div>
        )}
      </section>

      <section className="pt-14">
        <DayHeader
          date={tomorrow}
          weekdayChip={SERIES_LABEL[dayLabelFromYmd(tomorrow).slice(0, 3).toLowerCase()]}
          label={`${dayLabelFromYmd(tomorrow)} — On deck`}
        />
        {tomorrows.length === 0 ? (
          <Empty next />
        ) : (
          <div className="divide-y divide-line">
            {tomorrows.map((o) => (
              <OccurrenceCard key={o.id} o={o} />
            ))}
          </div>
        )}
      </section>

      <section className="pt-14">
        <p className="caps-wide text-red mb-4">Runs every week</p>
        <div className="grid md:grid-cols-3 gap-4">
          {series.slice(0, 9).map((s) => {
            const venue = venues.find((v) => v.slug === s.venueSlug);
            return (
              <Link
                key={s.id}
                href={venue ? `/venues/${venue.slug}` : "/venues"}
                className="block border border-foreground/30 p-4 hover:border-red transition"
              >
                <p className="caps-wide text-red mb-2">
                  {DAY_FULL[s.day]} · {s.startTime}
                </p>
                <p className="font-serif text-lg leading-tight">{s.name}</p>
                <p className="text-xs text-muted mt-1">{venue?.name ?? s.venueSlug}</p>
              </Link>
            );
          })}
        </div>
        <p className="caps mt-6">
          <Link href="/week" className="text-red hover:text-foreground">
            → See the full week
          </Link>
        </p>
      </section>
    </div>
  );
}

function Empty({ next }: { next?: boolean }) {
  return (
    <div className="border border-foreground/30 p-6 text-muted text-sm">
      <p>Nothing in the bandstand index {next ? "for tomorrow" : "tonight"}.</p>
      <p className="mt-2">
        v0 is hand-curated for the rooms without scrapers, so this is more often "we don't have
        it yet" than "there's nothing on." Check{" "}
        <a className="inline" href="https://www.chrisjazzcafe.com/" target="_blank" rel="noreferrer">
          Chris'
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
        if you're heading out.
      </p>
    </div>
  );
}
