import type { Metadata } from "next";

import Map from "@/components/Map";
import { TAG_COLOR, TAG_LABEL } from "@/components/TagChip";
import type { VenueTag } from "@/data/types";
import { venues } from "@/data/venues";

export const metadata: Metadata = {
  title: "The Map — The Bandstand",
  description:
    "Live jazz, jam sessions, listening rooms, vinyl bars, DJ nights, and the spots that play real jazz on the system, mapped across Philadelphia.",
  alternates: { canonical: "/map" },
  openGraph: {
    title: "The Map — The Bandstand",
    description: "Every Philadelphia jazz room mapped, filterable by the kind of night you want.",
    url: "/map",
    type: "website",
    siteName: "The Bandstand",
  },
};

const LEGEND_TAGS: VenueTag[] = [
  "live-jazz",
  "jam-session",
  "listening-room",
  "vinyl-bar",
  "dj-set",
  "jazz-on-system",
];

export default function MapPage() {
  return (
    <div>
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps mb-3">Where it lives</p>
          <h1 className="masthead text-[clamp(3rem,12vw,9rem)]">
            The Map.
          </h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>{venues.length} rooms,</p>
          <p>six categories,</p>
          <p>one city.</p>
        </div>
      </header>

      <p className="font-serif text-lg md:text-xl leading-snug max-w-3xl mt-8 mb-8">
        Not just stages. Vinyl bars, listening rooms, DJ nights, and the restaurants that
        actually pick records instead of letting the algorithm run. Filter for the kind of
        night you want.
      </p>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6 text-xs caps text-muted">
        {LEGEND_TAGS.map((t) => (
          <span key={t} className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: TAG_COLOR[t], border: "1.5px solid var(--background)", boxShadow: "0 0 0 1px var(--foreground)" }}
            />
            {TAG_LABEL[t]}
          </span>
        ))}
      </div>

      <Map venues={venues} />
    </div>
  );
}
