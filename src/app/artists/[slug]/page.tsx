import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ArtistProfile from "@/components/ArtistProfile";
import JsonLd from "@/components/JsonLd";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import SaveButton from "@/components/SaveButton";
import { getArtist, listArtists } from "@/lib/artists";
import { getEnrichedArtist } from "@/lib/enriched";
import { collaboratorsOf } from "@/lib/graph";
import { formatHumanDate } from "@/lib/dates";
import { musicEventLd } from "@/lib/jsonld";
import { groupByDate } from "@/lib/schedule";

export function generateStaticParams() {
  return listArtists().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = getArtist(slug);
  if (!artist) return {};
  const title = `${artist.name} — The Bandstand`;
  const description = `${artist.name} on upcoming Philadelphia jazz bills. ${artist.occurrences.length} show${artist.occurrences.length === 1 ? "" : "s"} in the next 60 days.`;
  const url = `/artists/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: "The Bandstand" },
  };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = getArtist(slug);
  if (!artist) notFound();

  const enriched = getEnrichedArtist(slug);
  const collaborators = collaboratorsOf(slug).slice(0, 8);

  const byDate = groupByDate(artist.occurrences);
  const dates = Array.from(byDate.keys()).sort();

  return (
    <div>
      <JsonLd data={artist.occurrences.map(musicEventLd)} />
      <Link
        href="/artists"
        className="caps text-muted hover:text-accent"
      >
        ← The players
      </Link>
      <div className="flex items-start gap-4 mt-3">
        <h1 className="masthead text-[clamp(2.5rem,6vw,4.5rem)]">{artist.name}</h1>
        <div className="pt-2">
          <SaveButton kind="artist" id={slug} label={artist.name} />
        </div>
      </div>
      <p className="caps text-muted mt-3">
        {artist.occurrences.length} {artist.occurrences.length === 1 ? "show" : "shows"} in the next
        60 days
      </p>

      {enriched && <ArtistProfile artist={enriched} />}

      {collaborators.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif italic text-3xl mb-6 border-b-2 border-foreground/80 pb-2">
            Often on the same stand
          </h2>
          <div className="flex flex-wrap gap-2">
            {collaborators.map((c) => (
              <Link
                key={c.slug}
                href={`/artists/${c.slug}`}
                className="inline-flex items-baseline gap-2 rounded-full border border-line px-3.5 py-2 hover:border-accent hover:text-accent transition-colors"
              >
                <span className="font-serif text-base leading-none">{c.name}</span>
                <span className="caps text-muted">×{c.shared}</span>
              </Link>
            ))}
          </div>
          <p className="caps text-muted mt-3">
            Shared bills, most-played first ·{" "}
            <Link href="/scene" className="hover:text-accent">
              see the whole scene
            </Link>
          </p>
        </section>
      )}

      <section className="mt-16">
        <h2 className="font-serif italic text-3xl mb-6 border-b-2 border-foreground/80 pb-2">
          Upcoming
        </h2>
        <div className="space-y-12">
          {dates.map((d) => (
            <div key={d}>
              <h3 className="caps text-accent mb-3 border-b border-line pb-1">
                {formatHumanDate(d)}
              </h3>
              <div className="divide-y divide-line">
                {(byDate.get(d) ?? []).map((o) => (
                  <OccurrenceCard key={o.id} o={o} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
