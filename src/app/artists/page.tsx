import Link from "next/link";

import { listArtists } from "@/lib/artists";

export default function ArtistsPage() {
  const artists = listArtists();

  return (
    <div>
      <header className="grid md:grid-cols-12 gap-6 pb-8 border-b border-foreground/30">
        <div className="md:col-span-9">
          <p className="caps-wide mb-3">Who&rsquo;s playing</p>
          <h1 className="font-serif italic text-[12vw] md:text-[8vw] leading-[0.85] tracking-tight">
            The Players.
          </h1>
        </div>
        <div className="md:col-span-3 self-end text-xs caps leading-[1.8]">
          <p>{artists.length} names,</p>
          <p>next 60 nights,</p>
          <p>on the stand.</p>
        </div>
      </header>

      <p className="font-serif text-lg md:text-xl leading-snug max-w-3xl mt-8 mb-10">
        Everyone we can name on an upcoming bill, alphabetized. This list is only as deep as the
        listings are tagged — a lot of great sit-ins never make the poster.
      </p>

      {artists.length === 0 ? (
        <p className="text-muted text-sm border border-foreground/30 p-4">
          No performers tagged on upcoming listings yet. Browse{" "}
          <Link href="/week" className="text-red hover:text-foreground">
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
              className="flex items-baseline justify-between gap-4 group border-b border-line py-3 hover:border-red"
            >
              <span className="font-serif text-xl md:text-2xl leading-tight">{a.name}</span>
              <span className="caps-wide text-muted whitespace-nowrap">
                {a.count} {a.count === 1 ? "show" : "shows"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
