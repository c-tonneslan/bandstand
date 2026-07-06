// JSON-LD builders for Google rich results. MusicVenue + MusicEvent, typed
// against schema.org's relevant fields (no `any`). Datetimes carry the real
// America/New_York offset so Google reads local wall-clock time correctly.

import type { Occurrence, Venue } from "@/data/types";
import { PHILLY_TZ } from "./dates";

const SITE_URL = "https://bandstand-bay.vercel.app";

interface PostalAddress {
  "@type": "PostalAddress";
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode?: string;
  addressCountry: "US";
}

interface GeoCoordinates {
  "@type": "GeoCoordinates";
  latitude: number;
  longitude: number;
}

interface MusicVenueNode {
  "@type": "MusicVenue";
  name: string;
  address: PostalAddress;
  geo: GeoCoordinates;
  url?: string;
}

export interface MusicVenueLd extends MusicVenueNode {
  "@context": "https://schema.org";
}

interface Offer {
  "@type": "Offer";
  url: string;
  availability: "https://schema.org/InStock";
}

interface MusicEventNode {
  "@type": "MusicEvent";
  name: string;
  startDate: string;
  endDate: string;
  eventStatus: "https://schema.org/EventScheduled";
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode";
  location: MusicVenueNode;
  url: string;
  offers?: Offer;
}

export interface MusicEventLd extends MusicEventNode {
  "@context": "https://schema.org";
}

// Parse "1421 Sansom St, Philadelphia, PA 19102" into schema.org fields. Falls
// back gracefully if the address doesn't split cleanly.
function parseAddress(address: string): PostalAddress {
  const parts = address.split(",").map((p) => p.trim());
  const streetAddress = parts[0] ?? address;
  const addressLocality = parts[1] ?? "Philadelphia";
  const stateZip = (parts[2] ?? "PA").split(/\s+/);
  const addressRegion = stateZip[0] ?? "PA";
  const postalCode = stateZip[1];
  return {
    "@type": "PostalAddress",
    streetAddress,
    addressLocality,
    addressRegion,
    ...(postalCode ? { postalCode } : {}),
    addressCountry: "US",
  };
}

function venueNode(venue: Venue): MusicVenueNode {
  return {
    "@type": "MusicVenue",
    name: venue.name,
    address: parseAddress(venue.address),
    geo: {
      "@type": "GeoCoordinates",
      latitude: venue.lat,
      longitude: venue.lng,
    },
    ...(venue.website ? { url: venue.website } : {}),
  };
}

// Wall-clock offset for a Philly date, e.g. "-04:00" in summer, "-05:00" in
// winter. Derived from Intl so DST is handled for us.
function phillyOffset(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PHILLY_TZ,
    timeZoneName: "longOffset",
  }).formatToParts(at);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-05:00";
  const match = raw.match(/([+-]\d{2}:\d{2})$/);
  return match ? match[1] : "-05:00";
}

// "2026-07-10" + "20:30" → "2026-07-10T20:30:00-04:00"
function isoWithOffset(date: string, time: string): string {
  const [h, m] = time.split(":");
  return `${date}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00${phillyOffset(date)}`;
}

// Default end = start + 2h, matching the iCal serializer's convention.
function defaultEndIso(date: string, startTime: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = startTime.split(":").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d, h + 2, mi));
  const endDate = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  const endTime = `${String(dt.getUTCHours()).padStart(2, "0")}:${String(dt.getUTCMinutes()).padStart(2, "0")}`;
  return isoWithOffset(endDate, endTime);
}

export function musicVenueLd(venue: Venue): MusicVenueLd {
  return {
    "@context": "https://schema.org",
    ...venueNode(venue),
    url: `${SITE_URL}/venues/${venue.slug}`,
  };
}

export function musicEventLd(o: Occurrence): MusicEventLd {
  const url = o.ticketUrl ?? `${SITE_URL}/venues/${o.venue.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: o.name,
    startDate: isoWithOffset(o.date, o.startTime),
    endDate: o.endTime ? isoWithOffset(o.date, o.endTime) : defaultEndIso(o.date, o.startTime),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: venueNode(o.venue),
    url,
    ...(o.ticketUrl
      ? {
          offers: {
            "@type": "Offer",
            url: o.ticketUrl,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };
}
