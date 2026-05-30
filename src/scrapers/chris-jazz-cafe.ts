// Scraper for Chris' Jazz Cafe. Their /events page is a clean list of
// .event-list-item blocks, each carrying one or more .event-times-group
// children (one per date), each with one or more <a href="/shows/N"> showtime
// links. We emit one Event per (event-block, date) pair, collapsing multiple
// showtimes for the same date into a single card with a "two sets" note.

import { load } from "cheerio";

import type { Event } from "@/data/types";
import { FETCH_HEADERS, type Scraper } from "./types";

const VENUE_SLUG = "chris-jazz-cafe";
const ROOT = "https://www.chrisjazzcafe.com";

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

// "Sat, May 30, 2026" → "2026-05-30"
function parseDateHeader(raw: string): string | null {
  const m = raw.trim().match(/(\w+,\s+)?(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})/i);
  if (!m) return null;
  const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
  if (!month) return null;
  const day = parseInt(m[3], 10);
  const year = parseInt(m[4], 10);
  if (!day || !year) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// " 7:30 PM " → "19:30"
function parseTime(raw: string): string | null {
  const m = raw.trim().match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3].toLowerCase();
  if (meridiem === "pm" && h !== 12) h += 12;
  if (meridiem === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// Bumps a HH:mm clock by minutes, no overflow past 23:59.
function bumpClock(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function isJamTitle(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes("jam");
}

// "19:30" → "7:30pm"
function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const meridiem = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${meridiem}` : `${h12}:${String(m).padStart(2, "0")}${meridiem}`;
}

export const scrapeChrisJazzCafe: Scraper = async () => {
  const scrapedAt = new Date().toISOString();
  const warnings: string[] = [];

  const res = await fetch(`${ROOT}/events`, { headers: FETCH_HEADERS });
  if (!res.ok) {
    throw new Error(`chris-jazz-cafe: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const $ = load(html);

  const events: Event[] = [];

  $(".event-list-item").each((_, el) => {
    const block = $(el);
    const header = block.find(".el-header a").first();
    const title = header.text().trim();
    const eventHref = header.attr("href") ?? "";
    const eventId = eventHref.replace(/[^0-9]/g, "") || `${VENUE_SLUG}-${title}`;

    // First paragraph of the description is usually the most useful note. The
    // venue's HTML sometimes puts personnel lines as <p> siblings and sometimes
    // as <br>-separated text in a single <p>; normalize <br> to " · " inside
    // each paragraph so we don't get "Ben Allison - bassSteve Cardenas - ...".
    const descParas = block
      .find(".el-description p")
      .map((_i, p) => {
        const $p = $(p);
        $p.find("br").replaceWith(" · ");
        return $p.text().replace(/\s+/g, " ").trim();
      })
      .get();
    const firstDesc = descParas.find((p) => p.length > 0) ?? "";
    const ticketPrice = (() => {
      const priceLine = descParas.find((p) => /^\$\d/.test(p));
      return priceLine ?? undefined;
    })();

    block.find(".event-times-group").each((_i, group) => {
      const g = $(group);
      const dateRaw = g.find("h6.event-date").first().text();
      const date = parseDateHeader(dateRaw);
      if (!date) {
        warnings.push(`chris: could not parse date "${dateRaw}" for "${title}"`);
        return;
      }

      const showAnchors = g.find('a[href^="/shows/"]').toArray();
      const showtimes = showAnchors
        .map((a) => {
          const $a = $(a);
          const t = parseTime($a.text());
          const showId = ($a.attr("href") ?? "").replace(/[^0-9]/g, "");
          return t ? { time: t, showId } : null;
        })
        .filter((x): x is { time: string; showId: string } => x !== null);

      if (showtimes.length === 0) return;

      showtimes.sort((a, b) => a.time.localeCompare(b.time));
      const first = showtimes[0];
      const last = showtimes[showtimes.length - 1];

      const isJam = isJamTitle(title);
      // Reserve "ticketed" for headlining sets, "jam" for late-night jams.
      const kind = isJam ? "jam" : "ticketed";
      const startTime = first.time;
      // Rough end-of-night estimate: 90 minutes after the last set.
      const endTime = bumpClock(last.time, 90);
      const setsLine =
        showtimes.length > 1
          ? `Two sets: ${showtimes.map((s) => to12h(s.time)).join(", ")}.`
          : "";
      const notes = [firstDesc, setsLine].filter(Boolean).join(" ").trim() || undefined;

      events.push({
        id: `chris-${eventId}-${date}`,
        venueSlug: VENUE_SLUG,
        date,
        startTime,
        endTime,
        name: title,
        kind,
        sitInPolicy: isJam ? "first-half-then-open" : undefined,
        ticketUrl: `${ROOT}/shows/${first.showId}`,
        ticketPrice,
        notes,
        confidence: "verified",
        verifiedAt: scrapedAt,
      });
    });
  });

  if (events.length === 0) {
    warnings.push("chris: zero events parsed, page structure may have changed");
  }

  return { venueSlug: VENUE_SLUG, scrapedAt, events, warnings };
};
