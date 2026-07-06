import type { Occurrence } from "@/data/types";
import { addDays, formatHumanDate, todayInPhilly } from "@/lib/dates";
import { resolveOccurrences } from "@/lib/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SITE_URL = "https://bandstand-bay.vercel.app";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// RFC 822 pubDate at the show's start, in Philly local time. We build the UTC
// instant via a fixed offset lookup, then let toUTCString emit GMT.
function pubDate(o: Occurrence): string {
  const [y, mo, d] = o.date.split("-").map(Number);
  const [h, mi] = o.startTime.split(":").map(Number);
  // Noon-UTC probe to read the day's offset, DST-aware.
  const probe = new Date(Date.UTC(y, mo - 1, d, 17, 0, 0));
  const raw =
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      timeZoneName: "longOffset",
    })
      .formatToParts(probe)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT-05:00";
  const match = raw.match(/([+-])(\d{2}):(\d{2})$/);
  const sign = match?.[1] === "+" ? 1 : -1;
  const offH = match ? Number(match[2]) : 5;
  const offM = match ? Number(match[3]) : 0;
  const utc = new Date(Date.UTC(y, mo - 1, d, h, mi) - sign * (offH * 60 + offM) * 60000);
  return utc.toUTCString();
}

function itemLink(o: Occurrence): string {
  return o.ticketUrl ?? `${SITE_URL}/venues/${o.venue.slug}`;
}

export function GET() {
  const start = todayInPhilly();
  const end = addDays(start, 14);
  const occ = resolveOccurrences({ start, end });

  const items = occ
    .map((o) => {
      const title = escapeXml(`${o.name} · ${o.venue.name} · ${formatHumanDate(o.date)}`);
      const link = escapeXml(itemLink(o));
      const descParts = [o.venue.address];
      if (o.notes) descParts.push(o.notes);
      if (o.confidence !== "verified") descParts.push(`Confidence: ${o.confidence} — check the venue.`);
      const description = escapeXml(descParts.join(" — "));
      return [
        "    <item>",
        `      <title>${title}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="false">${escapeXml(`${o.id}@bandstand-bay.vercel.app`)}</guid>`,
        `      <pubDate>${pubDate(o)}</pubDate>`,
        `      <description>${description}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    "    <title>The Bandstand · Philly jazz, this fortnight</title>",
    `    <link>${SITE_URL}</link>`,
    "    <description>Upcoming Philadelphia jazz shows, jams, and listening nights for the next two weeks.</description>",
    "    <language>en-us</language>",
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    items,
    "  </channel>",
    "</rss>",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
