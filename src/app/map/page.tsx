import Map from "@/components/Map";
import { venues } from "@/data/venues";

export const metadata = {
  title: "Map — The Bandstand",
  description:
    "Live jazz, jam sessions, listening rooms, vinyl bars, DJ nights, and the spots that play real jazz on the system, mapped across Philadelphia.",
};

export default function MapPage() {
  return (
    <div>
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps-wide mb-3">Where it lives</p>
          <h1 className="font-serif italic text-[12vw] md:text-[8vw] leading-[0.85] tracking-tight">
            The Map.
          </h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>{venues.length} rooms,</p>
          <p>six categories,</p>
          <p>one city.</p>
        </div>
      </header>

      <p className="font-serif text-lg md:text-xl leading-snug max-w-3xl mt-8 mb-10">
        Not just stages. Vinyl bars, listening rooms, DJ nights, and the restaurants that
        actually pick records instead of letting the algorithm run. Filter for the kind of
        night you want.
      </p>

      <Map venues={venues} />
    </div>
  );
}
