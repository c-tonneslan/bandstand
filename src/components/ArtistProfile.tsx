import type { EnrichedArtist } from "@/lib/enriched";
import SpotifyEmbed from "./SpotifyEmbed";

// Enrichment block for an artist page: photo + credit, hometown/genres meta, a
// Wikipedia-sourced bio (CC BY-SA — attribution and backlink are required), the
// Spotify embed, and an outbound links row. Every part is optional; we only
// render what the enrichment data actually carries.
//
// The photo is a remote Wikimedia/Commons thumbnail, so it's a plain <img>
// (lazy, explicit box) rather than next/image — no remote-host config needed.

export default function ArtistProfile({ artist }: { artist: EnrichedArtist }) {
  const { photo, hometown, genres, bio, bioSource, spotifyId, links } = artist;

  const meta = [hometown, genres && genres.length > 0 ? genres.join(" · ") : null].filter(Boolean);
  const hasBody = bio || spotifyId || (links && links.length > 0) || meta.length > 0;
  if (!photo && !hasBody) return null;

  return (
    <section className="mt-10 grid gap-8 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:items-start">
      {photo && (
        <figure className="m-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={artist.name}
            loading="lazy"
            width={220}
            height={220}
            className="w-full max-w-[220px] rounded-[--radius] border border-line object-cover"
          />
          {(photo.credit || photo.license) && (
            <figcaption className="caps text-muted mt-2 leading-relaxed">
              {photo.sourceUrl ? (
                <a
                  href={photo.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent"
                >
                  {[photo.credit, photo.license].filter(Boolean).join(" · ")}
                </a>
              ) : (
                [photo.credit, photo.license].filter(Boolean).join(" · ")
              )}
            </figcaption>
          )}
        </figure>
      )}

      <div className="min-w-0">
        {meta.length > 0 && <p className="caps text-muted">{meta.join("  ·  ")}</p>}

        {bio && (
          <p className="mt-4 max-w-2xl leading-relaxed text-foreground/90">
            {bio}
            {bioSource && (
              <>
                {" "}
                <a href={bioSource.url} rel="noreferrer" className="inline text-sm">
                  via {bioSource.title} · {bioSource.license}
                </a>
              </>
            )}
          </p>
        )}

        {spotifyId && (
          <div className="mt-6 max-w-xl">
            <SpotifyEmbed spotifyId={spotifyId} name={artist.name} />
          </div>
        )}

        {links && links.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
              >
                {l.label}
                <span aria-hidden="true">&rarr;</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
