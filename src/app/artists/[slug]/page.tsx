import Link from "next/link";
import { notFound } from "next/navigation";

import { OccurrenceCard } from "@/components/OccurrenceCard";
import { getArtist, listArtists } from "@/lib/artists";
import { formatHumanDate } from "@/lib/dates";
import { groupByDate } from "@/lib/schedule";

export function generateStaticParams() {
  return listArtists().map((a) => ({ slug: a.slug }));
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = getArtist(slug);
  if (!artist) notFound();

  const byDate = groupByDate(artist.occurrences);
  const dates = Array.from(byDate.keys()).sort();

  return (
    <div>
      <Link
        href="/artists"
        className="caps text-muted hover:text-accent"
      >
        ← The players
      </Link>
      <h1 className="masthead text-[clamp(2.5rem,6vw,4.5rem)] mt-3">{artist.name}</h1>
      <p className="caps text-muted mt-3">
        {artist.occurrences.length} {artist.occurrences.length === 1 ? "show" : "shows"} in the next
        60 days
      </p>

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
