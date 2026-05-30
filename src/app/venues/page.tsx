import Link from "next/link";

import { TagChip } from "@/components/TagChip";
import { venues } from "@/data/venues";

export default function VenuesPage() {
  // Group by neighborhood for the list rendering.
  const sorted = [...venues].sort((a, b) =>
    a.neighborhood === b.neighborhood
      ? a.name.localeCompare(b.name)
      : a.neighborhood.localeCompare(b.neighborhood),
  );
  const groups = new Map<string, typeof venues>();
  for (const v of sorted) {
    const arr = groups.get(v.neighborhood) ?? [];
    arr.push(v);
    groups.set(v.neighborhood, arr);
  }

  return (
    <div>
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps-wide mb-3">Where to listen</p>
          <h1 className="font-serif italic text-[12vw] md:text-[8vw] leading-[0.85] tracking-tight">
            The Rooms.
          </h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>{venues.length} venues,</p>
          <p>{groups.size} neighborhoods,</p>
          <p>six categories.</p>
        </div>
      </header>

      <p className="font-serif text-lg md:text-xl leading-snug max-w-3xl mt-8 mb-10">
        Every room in the bandstand index, grouped by neighborhood. The vibe line is the most
        honest thing we can tell you without you being there.
      </p>

      <p className="caps mb-10">
        <Link href="/map" className="text-red hover:text-foreground">
          → See them all on the map
        </Link>
      </p>

      <div className="space-y-12">
        {Array.from(groups.entries()).map(([hood, vs]) => (
          <section key={hood}>
            <h2 className="caps text-red mb-4 border-b border-foreground/30 pb-2">{hood}</h2>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
              {vs.map((v) => (
                <Link
                  key={v.slug}
                  href={`/venues/${v.slug}`}
                  className="block group border-b border-line pb-4 hover:border-red"
                >
                  <h3 className="font-serif text-2xl leading-tight">{v.name}</h3>
                  <p className="caps-wide text-muted mt-1.5">{v.address}</p>
                  <p className="text-sm mt-3 text-foreground/90">{v.blurb}</p>
                  <p className="text-xs text-muted mt-2">
                    <span className="text-foreground/80">{v.vibe}</span> · {v.cover}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {v.tags.map((t) => (
                      <TagChip key={t} tag={t} />
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
