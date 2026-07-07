import { appleMapsDir, googleMapsDir, type VenueTransit } from "@/lib/enriched";

// "Getting there" for a venue. Directions deep links are always available
// (pure functions off lat/lng). Nearest transit stops only render when the
// SEPTA-derived enrichment exists — and where it does, we credit SEPTA.

function meters(d: number): string {
  return `~${Math.round(d)}m`;
}

export default function TransitLinks({
  lat,
  lng,
  transit,
}: {
  lat: number;
  lng: number;
  transit: VenueTransit | null;
}) {
  const stops = transit?.stops?.slice(0, 3) ?? [];

  return (
    <section className="mt-16">
      <h2 className="font-serif italic text-3xl mb-6 border-b-2 border-foreground/80 pb-2">
        Getting there
      </h2>

      <div className="flex flex-wrap gap-3">
        <a
          href={googleMapsDir(lat, lng, "transit")}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-sm"
        >
          Google Maps
        </a>
        <a
          href={appleMapsDir(lat, lng, "transit")}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-sm"
        >
          Apple Maps
        </a>
        <a
          href={googleMapsDir(lat, lng, "walking")}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-sm"
        >
          Walking
        </a>
      </div>

      {stops.length > 0 && (
        <div className="mt-8">
          <h3 className="caps text-accent mb-3 border-b border-line pb-1">Nearest transit</h3>
          <ul className="divide-y divide-line">
            {stops.map((s) => (
              <li key={s.name} className="flex items-baseline justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="text-foreground/90">{s.name}</span>
                  {s.routes.length > 0 && (
                    <span className="caps text-muted ml-3">{s.routes.join(" · ")}</span>
                  )}
                </span>
                <span className="tnum font-mono text-xs text-muted/70 shrink-0">
                  {meters(s.distMeters)}
                </span>
              </li>
            ))}
          </ul>
          <p className="caps text-muted/70 mt-3">Transit data © SEPTA</p>
        </div>
      )}
    </section>
  );
}
