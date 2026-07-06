import type { Metadata } from "next";
import Link from "next/link";

import { listArtists } from "@/lib/artists";

export const metadata: Metadata = {
  title: "The Players — The Bandstand",
  description:
    "Everyone we can name on an upcoming Philadelphia jazz bill over the next 60 nights, alphabetized.",
  alternates: { canonical: "/artists" },
  openGraph: {
    title: "The Players — The Bandstand",
    description: "Performers on upcoming Philadelphia jazz bills, alphabetized.",
    url: "/artists",
    type: "website",
    siteName: "The Bandstand",
  },
};

export default function ArtistsPage() {
  const artists = listArtists();

  return (
    <div>
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps mb-3">Who&rsquo;s playing</p>
          <h1 className="masthead text-[clamp(3rem,9vw,6rem)]">
            The Players.
          </h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>{artists.length} names,</p>
          <p>next 60 nights,</p>
          <p>on the stand.</p>
        </div>
      </header>

      <p className="deck max-w-3xl mt-8 mb-16">
        Everyone we can name on an upcoming bill, alphabetized. This list is only as deep as the
        listings are tagged — a lot of great sit-ins never make the poster.
      </p>

      {artists.length === 0 ? (
        <p className="text-muted text-sm border border-foreground/30 p-4">
          No performers tagged on upcoming listings yet. Browse{" "}
          <Link href="/week" className="text-accent hover:text-foreground">
            the week
          </Link>{" "}
          for what&rsquo;s on.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-1">
          {artists.map((a) => (
            <Link
              key={a.slug}
              href={`/artists/${a.slug}`}
              className="flex items-baseline justify-between gap-4 group border-b border-line py-3 hover:border-accent"
            >
              <span className="font-serif text-xl md:text-2xl leading-tight">{a.name}</span>
              <span className="caps text-muted whitespace-nowrap">
                {a.count} {a.count === 1 ? "show" : "shows"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
