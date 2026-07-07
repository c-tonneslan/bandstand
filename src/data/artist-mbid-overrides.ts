// Hand-curated MBID pins for scripts/enrich-artists.ts. The resolver's
// name->MBID search is fuzzy, so this file is the escape hatch:
//
//   "artist-slug": "<musicbrainz-artist-mbid>"  -> force this MBID (confidence: "override")
//   "artist-slug": null                          -> skip enrichment entirely (no bad match)
//
// Keys are artistSlug(name) from src/lib/artists.ts. An override always wins
// over the automatic search. Add an entry here when the run reports a low
// confidence match, or when you spot a wrong-person match (e.g. a common name
// resolving to a different musician).
export const artistMbidOverrides: Record<string, string | null> = {
  // Common name that resolves to unrelated artists on MusicBrainz; skip until
  // a curator confirms the right Philadelphia player.
  "jake-miller": null,
  "matt-miller": null,
};
