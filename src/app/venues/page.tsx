import Link from "next/link";

import { venues } from "@/data/venues";

export default function VenuesPage() {
  // Sort by neighborhood so people can mentally cluster.
  const sorted = [...venues].sort((a, b) =>
    a.neighborhood === b.neighborhood
      ? a.name.localeCompare(b.name)
      : a.neighborhood.localeCompare(b.neighborhood),
  );

  // Group by neighborhood for the list rendering.
  const groups = new Map<string, typeof venues>();
  for (const v of sorted) {
    const arr = groups.get(v.neighborhood) ?? [];
    arr.push(v);
    groups.set(v.neighborhood, arr);
  }

  return (
    <div>
      <p className="font-mono uppercase tracking-widest text-xs text-muted mb-2">
        where to listen
      </p>
      <h1 className="font-serif text-4xl mb-3">Venues</h1>
      <p className="text-muted max-w-2xl mb-10">
        Every room in the bandstand index, grouped by neighborhood. The vibe line is the most
        honest thing we can tell you without you being there.
      </p>

      <div className="space-y-10">
        {Array.from(groups.entries()).map(([hood, vs]) => (
          <section key={hood}>
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted mb-4">{hood}</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {vs.map((v) => (
                <Link
                  key={v.slug}
                  href={`/venues/${v.slug}`}
                  className="block border border-line hover:border-brass-soft/60 rounded-md p-4 transition"
                >
                  <h3 className="font-serif text-xl mb-1">{v.name}</h3>
                  <p className="text-sm text-muted mb-2 font-mono">{v.address}</p>
                  <p className="text-sm">{v.blurb}</p>
                  <p className="text-xs text-muted mt-2">
                    <span className="text-foreground/70">{v.vibe}</span> · {v.cover}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
