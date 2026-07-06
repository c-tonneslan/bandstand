// Repertory-style "centerpiece" card: a faux-poster on the left, a booker's
// note on the right. Used on the homepage to pick out the headline pick for
// tonight when there's one worth pointing at. The poster is a stretched link
// into the venue page; the ticket / verify anchors sit above it.

import Link from "next/link";

import type { Occurrence } from "@/data/types";
import { formatHumanTime } from "@/lib/dates";

export function Featured({ o }: { o: Occurrence }) {
  return (
    <section className="grid md:grid-cols-12 gap-8 md:gap-10 py-10 border-b border-line">
      <div className="md:col-span-5">
        <div className="group relative aspect-[4/5] max-h-[360px] bg-accent text-background overflow-hidden transition-[transform,box-shadow] duration-[--dur-slow] ease-[--ease] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
          <Link
            href={`/venues/${o.venue.slug}`}
            aria-label={`${o.name} at ${o.venue.name}`}
            className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-background"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 transition-[filter] duration-[--dur-slow] group-hover:brightness-105" />
          <div className="absolute inset-0 p-6 md:p-8 flex flex-col">
            <p className="caps opacity-90">Centerpiece · Tonight</p>
            <p className="mt-auto font-serif italic text-4xl md:text-5xl leading-[0.9] tracking-tight">
              {o.name}
            </p>
            <p className="caps opacity-90 mt-6">
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
        <p className="caps mb-4 text-accent">A note from the booker</p>
        <p className="deck">
          {o.notes ?? "The pick for the night. Get there for the first set, stay for the second."}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
          {o.ticketUrl && (
            <a href={o.ticketUrl} target="_blank" rel="noreferrer" className="btn btn-ticket">
              Tickets
              {o.ticketPrice && (
                <span className="font-mono normal-case tracking-normal opacity-80">
                  {o.ticketPrice}
                </span>
              )}
              <span aria-hidden="true">&rarr;</span>
            </a>
          )}
          <Link href={`/venues/${o.venue.slug}`} className="caps text-accent hover:text-foreground">
            → {o.venue.neighborhood} room
          </Link>
          {o.venue.website && (
            <a
              href={o.venue.website}
              target="_blank"
              rel="noreferrer"
              className="caps text-muted hover:text-accent"
            >
              → Verify on venue site
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
