import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import JsonLd from "@/components/JsonLd";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import SaveButton from "@/components/SaveButton";
import { TagChip } from "@/components/TagChip";
import TransitLinks from "@/components/TransitLinks";
import { venues } from "@/data/venues";
import { addDays, todayInPhilly } from "@/lib/dates";
import { getVenueTransit } from "@/lib/enriched";
import { musicEventLd, musicVenueLd } from "@/lib/jsonld";
import { groupByDate, resolveOccurrences } from "@/lib/schedule";

export const revalidate = 3600;

export function generateStaticParams() {
  return venues.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const venue = venues.find((v) => v.slug === slug);
  if (!venue) return {};
  const title = `${venue.name} — The Bandstand`;
  const description = `${venue.blurb} ${venue.neighborhood}, Philadelphia. Upcoming jazz nights, jams, and listings.`;
  const url = `/venues/${venue.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: "The Bandstand" },
  };
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

  const transit = getVenueTransit(slug);

  const ld = [musicVenueLd(venue), ...upcoming.map(musicEventLd)];

  return (
    <div>
      <JsonLd data={ld} />
      <Link
        href="/venues"
        className="caps text-muted hover:text-accent"
      >
        ← The rooms
      </Link>
      <div className="flex items-start gap-4 mt-3">
        <h1 className="masthead text-[clamp(2.5rem,6vw,4.5rem)]">{venue.name}</h1>
        <div className="pt-2">
          <SaveButton kind="venue" id={venue.slug} label={venue.name} />
        </div>
      </div>
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

      <TransitLinks lat={venue.lat} lng={venue.lng} transit={transit} />

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
