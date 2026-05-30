// Repertory-style "centerpiece" card: a faux-poster on the left, a booker's
// note on the right. Used on the homepage to pick out the headline pick for
// tonight when there's one worth pointing at.

import Link from "next/link";

import type { Occurrence } from "@/data/types";
import { formatHumanTime } from "@/lib/dates";

export function Featured({ o }: { o: Occurrence }) {
  return (
    <section className="grid md:grid-cols-12 gap-8 md:gap-10 py-10 border-b border-foreground/30">
      <div className="md:col-span-5">
        <div className="aspect-[3/4] bg-red text-background relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
          <div className="absolute inset-0 p-6 md:p-8 flex flex-col">
            <p className="caps-wide opacity-90">Centerpiece · Tonight</p>
            <p className="mt-auto font-serif italic text-4xl md:text-6xl leading-[0.9] tracking-tight">
              {o.name}
            </p>
            <p className="caps-wide opacity-90 mt-6">
              {o.venue.name} · {formatHumanTime(o.startTime)}
              {o.endTime ? ` → ${formatHumanTime(o.endTime)}` : ""}
            </p>
          </div>
          <div className="absolute top-6 right-6 w-12 h-12 rounded-full border border-background/70 flex items-center justify-center text-xs caps">
            ★
          </div>
        </div>
      </div>
      <div className="md:col-span-7">
        <p className="caps-wide mb-4 text-red">A note from the booker</p>
        {o.notes ? (
          <p className="font-serif text-xl md:text-2xl leading-snug">{o.notes}</p>
        ) : (
          <p className="font-serif text-xl md:text-2xl leading-snug">
            The pick for the night. Get there for the first set, stay for the second.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm caps">
          <Link href={`/venues/${o.venue.slug}`} className="text-red hover:text-foreground">
            → {o.venue.neighborhood} room
          </Link>
          {o.ticketUrl && (
            <a
              href={o.ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="text-red hover:text-foreground"
            >
              → Tickets{o.ticketPrice ? ` · ${o.ticketPrice}` : ""}
            </a>
          )}
          {o.venue.website && (
            <a
              href={o.venue.website}
              target="_blank"
              rel="noreferrer"
              className="text-muted hover:text-red"
            >
              → Verify on venue site
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
