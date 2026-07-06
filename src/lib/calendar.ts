// Client-side calendar helpers. The .ics rendering reuses the pure renderer in
// src/lib/ics.ts; the rest are add-to-calendar URL builders and a Blob download.

import type { Occurrence } from "@/data/types";
import { renderIcs } from "./ics";

export function toIcs(occurrences: Occurrence[]): string {
  return renderIcs("My Nights — The Bandstand", "Saved shows from The Bandstand.", occurrences);
}

export function downloadIcs(name: string, occurrences: Occurrence[]) {
  if (typeof window === "undefined") return;
  const blob = new Blob([toIcs(occurrences)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.endsWith(".ics") ? name : `${name}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// "2026-05-30" + "20:30" → "20260530T203000". Local wall-clock, no Z suffix.
function localStamp(date: string, time: string): string {
  const [h, m] = time.split(":");
  return `${date.replace(/-/g, "")}T${h.padStart(2, "0")}${m.padStart(2, "0")}00`;
}

function endParts(o: Occurrence): { date: string; time: string } {
  if (o.endTime) return { date: o.date, time: o.endTime };
  const [y, mo, d] = o.date.split("-").map(Number);
  const [h, mi] = o.startTime.split(":").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d, h + 2, mi));
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`,
    time: `${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}`,
  };
}

function details(o: Occurrence): string {
  const parts: string[] = [];
  if (o.performers?.length) parts.push(o.performers.join(", "));
  if (o.notes) parts.push(o.notes);
  if (o.ticketUrl) parts.push(`Tickets: ${o.ticketUrl}`);
  if (o.venue.website) parts.push(`Venue: ${o.venue.website}`);
  return parts.join("\n");
}

export function googleCalendarUrl(o: Occurrence): string {
  const end = endParts(o);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${o.name} — ${o.venue.name}`,
    dates: `${localStamp(o.date, o.startTime)}/${localStamp(end.date, end.time)}`,
    ctz: "America/New_York",
    location: `${o.venue.name}, ${o.venue.address}`,
    details: details(o),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookUrl(o: Occurrence): string {
  const end = endParts(o);
  const iso = (date: string, time: string) => `${date}T${time.padStart(5, "0")}:00`;
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: `${o.name} — ${o.venue.name}`,
    startdt: iso(o.date, o.startTime),
    enddt: iso(end.date, end.time),
    location: `${o.venue.name}, ${o.venue.address}`,
    body: details(o),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
