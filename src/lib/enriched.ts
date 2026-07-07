// Build-time enrichment contract. A separate, occasionally-run script
// (scripts/enrich-artists.ts, scripts/septa-stops.ts) writes the JSON files;
// pages read them through the loaders here. Everything is optional so the UI
// degrades gracefully when an artist or venue has no enrichment yet.

import artistsEnriched from "@/data/artists-enriched.json";
import venueTransit from "@/data/venue-transit.json";

export interface EnrichedArtistLink {
  label: string; // "Wikipedia" | "Bandcamp" | "Discogs" | "Homepage" | "Instagram" ...
  url: string;
}

export interface EnrichedArtistPhoto {
  url: string;
  credit?: string; // e.g. "Photo: Jane Doe"
  license?: string; // e.g. "CC BY-SA 4.0"
  sourceUrl?: string; // link back to the file/description page
}

export interface EnrichedArtist {
  slug: string; // artistSlug(name) — the key
  name: string;
  mbid?: string;
  bio?: string; // short Wikipedia extract
  bioSource?: { title: string; url: string; license: string }; // CC BY-SA attribution
  photo?: EnrichedArtistPhoto;
  hometown?: string;
  genres?: string[];
  spotifyId?: string; // Spotify artist id -> https://open.spotify.com/embed/artist/{id}
  links?: EnrichedArtistLink[];
  resolvedAt?: string;
  confidence?: "high" | "low" | "override";
}

export interface TransitStop {
  name: string;
  routes: string[];
  distMeters: number;
}

export interface VenueTransit {
  slug: string;
  stops?: TransitStop[];
}

const ARTISTS = artistsEnriched as Record<string, EnrichedArtist>;
const TRANSIT = venueTransit as Record<string, VenueTransit>;

export function getEnrichedArtist(slug: string): EnrichedArtist | null {
  return ARTISTS[slug] ?? null;
}

export function getVenueTransit(slug: string): VenueTransit | null {
  return TRANSIT[slug] ?? null;
}

// Directions deep links — pure functions, no data needed beyond the venue.
export function googleMapsDir(lat: number, lng: number, mode: "transit" | "walking" = "transit"): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${mode}`;
}

export function appleMapsDir(lat: number, lng: number, mode: "transit" | "walking" = "transit"): string {
  return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=${mode === "transit" ? "r" : "w"}`;
}
