import Link from "next/link";
import { notFound } from "next/navigation";

import { OccurrenceCard } from "@/components/OccurrenceCard";
import { venues } from "@/data/venues";
import { addDays, todayInPhilly } from "@/lib/dates";
import { groupByDate, resolveOccurrences } from "@/lib/schedule";

export function generateStaticParams() {
  return venues.map((v) => ({ slug: v.slug }));
}

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = venues.find((v) => v.slug === slug);
  if (!venue) notFound();

  const start = todayInPhilly();
  const end = addDays(start, 30);
  const upcoming = resolveOccurrences({ start, end }).filter((o) => o.venue.slug === slug);
  const byDate = groupByDate(upcoming);
  const dates = Array.from(byDate.keys()).sort();

  return (
    <div>
      <Link
        href="/venues"
        className="text-sm font-mono uppercase tracking-widest text-muted hover:text-brass"
      >
        ← all venues
      </Link>
      <h1 className="font-serif text-5xl mt-3">{venue.name}</h1>
      <p className="font-mono text-sm text-muted mt-2">
        {venue.address}
        <span className="mx-2">·</span>
        {venue.neighborhood}
      </p>
      <p className="mt-6 max-w-2xl">{venue.blurb}</p>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        <span className="text-foreground/80">{venue.vibe}</span> · {venue.cover}
      </p>
      <p className="mt-4 flex gap-4 text-sm">
        {venue.website && (
          <a className="inline" href={venue.website} target="_blank" rel="noreferrer">
            website
          </a>
        )}
        {venue.instagram && (
          <a className="inline" href={venue.instagram} target="_blank" rel="noreferrer">
            instagram
          </a>
        )}
        <a
          className="inline"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`}
          target="_blank"
          rel="noreferrer"
        >
          map
        </a>
      </p>

      <section className="mt-12">
        <h2 className="font-serif text-2xl mb-4">Next 30 days</h2>
        {dates.length === 0 ? (
          <p className="text-muted text-sm border border-line rounded-md p-4">
            Nothing indexed for this venue in the next 30 days. Check their site directly.
          </p>
        ) : (
          <div className="space-y-8">
            {dates.map((d) => (
              <div key={d}>
                <h3 className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
                  {d}
                </h3>
                <div className="grid gap-3">
                  {(byDate.get(d) ?? []).map((o) => (
                    <OccurrenceCard key={o.id} o={o} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
