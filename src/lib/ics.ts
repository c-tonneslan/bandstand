// Minimal RFC 5545 VCALENDAR serializer for bandstand occurrences. Emits a
// fixed VTIMEZONE block for America/New_York so calendar clients render the
// wall-clock time the show actually happens at, regardless of the subscriber's
// own time zone.

import type { Occurrence } from "@/data/types";

// VTIMEZONE good through 2099. Standard US Eastern rules.
const VTIMEZONE_NY = [
  "BEGIN:VTIMEZONE",
  "TZID:America/New_York",
  "BEGIN:STANDARD",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
].join("\r\n");

// "2026-05-30" + "20:30" → "20260530T203000"
function toIcsDateTime(date: string, time: string): string {
  const d = date.replace(/-/g, "");
  const [h, m] = time.split(":");
  return `${d}T${h.padStart(2, "0")}${m.padStart(2, "0")}00`;
}

// Default end = start + 2h if not provided.
function defaultEnd(date: string, startTime: string): { date: string; time: string } {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = startTime.split(":").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d, h + 2, mi));
  const newDate = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  const newTime = `${String(dt.getUTCHours()).padStart(2, "0")}:${String(dt.getUTCMinutes()).padStart(2, "0")}`;
  return { date: newDate, time: newTime };
}

// RFC 5545 §3.3.11: escape commas, semicolons, backslashes, newlines.
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// Fold lines at 75 octets per RFC 5545 §3.1. We approximate by character count;
// good enough for ASCII bodies, and calendar clients tolerate slight excess.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + 75);
    if (i === 0) out.push(chunk);
    else out.push(` ${chunk}`);
    i += 75;
  }
  return out.join("\r\n");
}

function eventBlock(o: Occurrence): string {
  const end = o.endTime
    ? { date: o.date, time: o.endTime }
    : defaultEnd(o.date, o.startTime);
  const dtStart = toIcsDateTime(o.date, o.startTime);
  const dtEnd = toIcsDateTime(end.date, end.time);
  const summary = escapeText(`${o.name} — ${o.venue.name}`);
  const descLines: string[] = [];
  if (o.notes) descLines.push(o.notes);
  if (o.sitInPolicy) descLines.push(`Sit-in policy: ${o.sitInPolicy}`);
  if (o.ticketUrl) descLines.push(`Tickets: ${o.ticketUrl}`);
  if (o.venue.website) descLines.push(`Venue: ${o.venue.website}`);
  if (o.confidence !== "verified") descLines.push(`Confidence: ${o.confidence}`);
  const description = escapeText(descLines.join("\n"));
  const location = escapeText(`${o.venue.name}, ${o.venue.address}`);
  const url = o.ticketUrl ?? o.venue.website ?? "";
  const uid = `${o.id}@bandstand-bay.vercel.app`;
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=America/New_York:${dtStart}`,
    `DTEND;TZID=America/New_York:${dtEnd}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
  ];
  if (description) lines.push(`DESCRIPTION:${description}`);
  if (url) lines.push(`URL:${url}`);
  lines.push("END:VEVENT");
  return lines.map(foldLine).join("\r\n");
}

export function renderIcs(
  name: string,
  description: string,
  occurrences: Occurrence[],
): string {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//bandstand//philly jazz//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    `X-WR-CALDESC:${escapeText(description)}`,
    "X-WR-TIMEZONE:America/New_York",
    VTIMEZONE_NY,
  ].join("\r\n");
  const body = occurrences.map(eventBlock).join("\r\n");
  const footer = "END:VCALENDAR";
  return [header, body, footer].filter(Boolean).join("\r\n") + "\r\n";
}

export function icsResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      // Hint subscribers to re-fetch periodically; this is a hint, not a contract.
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
