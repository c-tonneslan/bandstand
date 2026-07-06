import Link from "next/link";
import { notFound } from "next/navigation";

import { OccurrenceCard } from "@/components/OccurrenceCard";
import { TagChip } from "@/components/TagChip";
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
        className="caps text-muted hover:text-accent"
      >
        ← The rooms
      </Link>
      <h1 className="masthead text-[clamp(2.5rem,6vw,4.5rem)] mt-3">{venue.name}</h1>
      <p className="caps text-muted mt-3">
        {venue.address}
        <span className="mx-2">·</span>
        {venue.neighborhood}
      </p>
      <div className="flex flex-wrap gap-2 mt-4">
        {venue.tags.map((t) => (
          <TagChip key={t} tag={t} size="md" />
        ))}
      </div>
      <p className="deck mt-8 max-w-2xl">{venue.blurb}</p>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        <span className="text-foreground/80">{venue.vibe}</span> · {venue.cover}
      </p>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm caps">
        {venue.website && (
          <a className="text-accent hover:text-foreground" href={venue.website} target="_blank" rel="noreferrer">
            → Website
          </a>
        )}
        {venue.instagram && (
          <a className="text-accent hover:text-foreground" href={venue.instagram} target="_blank" rel="noreferrer">
            → Instagram
          </a>
        )}
        <a
          className="text-accent hover:text-foreground"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`}
          target="_blank"
          rel="noreferrer"
        >
          → Directions
        </a>
        <a className="text-accent hover:text-foreground" href={`/cal/venues/${venue.slug}`}>
          → Calendar feed
        </a>
      </p>

      <section className="mt-16">
        <h2 className="font-serif italic text-3xl mb-6 border-b-2 border-foreground/80 pb-2">
          Next 30 days
        </h2>
        {dates.length === 0 ? (
          <p className="text-muted text-sm border border-foreground/30 p-4">
            Nothing indexed for this room in the next 30 days. Check their site directly.
          </p>
        ) : (
          <div className="space-y-12">
            {dates.map((d) => (
              <div key={d}>
                <h3 className="caps text-accent mb-3 border-b border-line pb-1">{d}</h3>
                <div className="divide-y divide-line">
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
