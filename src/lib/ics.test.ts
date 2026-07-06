import { describe, expect, it } from "vitest";

import type { Occurrence, Venue } from "@/data/types";

import { renderIcs } from "./ics";

const venue: Venue = {
  slug: "heritage",
  name: "Heritage",
  neighborhood: "Northern Liberties",
  address: "914 N 2nd St",
  lat: 39.96,
  lng: -75.14,
  website: "https://heritage.example",
  blurb: "",
  vibe: "",
  cover: "free",
  tags: ["live-jazz"],
};

function occ(over: Partial<Occurrence> = {}): Occurrence {
  return {
    id: "wed-jam@2026-06-03",
    venue,
    date: "2026-06-03",
    startTime: "21:30",
    endTime: "23:30",
    name: "Wednesday Jam",
    kind: "jam",
    confidence: "verified",
    source: "series",
    ...over,
  };
}

function lines(ics: string): string[] {
  return ics.split("\r\n");
}

describe("renderIcs — structure", () => {
  it("wraps events in a single VCALENDAR", () => {
    const ics = renderIcs("Cal", "desc", [occ(), occ({ id: "b" }), occ({ id: "c" })]);
    expect((ics.match(/BEGIN:VCALENDAR/g) ?? []).length).toBe(1);
    expect((ics.match(/END:VCALENDAR/g) ?? []).length).toBe(1);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(3);
    expect((ics.match(/END:VEVENT/g) ?? []).length).toBe(3);
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("emits N VEVENTs for N occurrences", () => {
    const five = Array.from({ length: 5 }, (_, i) => occ({ id: `e${i}` }));
    const ics = renderIcs("Cal", "desc", five);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(5);
  });

  it("includes the VTIMEZONE block and calendar headers", () => {
    const ics = renderIcs("My Cal", "My Desc", [occ()]);
    expect(ics).toContain("BEGIN:VTIMEZONE");
    expect(ics).toContain("TZID:America/New_York");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("X-WR-CALNAME:My Cal");
    expect(ics).toContain("X-WR-CALDESC:My Desc");
  });

  it("produces a header + footer only when there are no occurrences", () => {
    const ics = renderIcs("Empty", "none", []);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(0);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
  });
});

describe("renderIcs — datetime formatting", () => {
  it("formats DTSTART/DTEND with TZID and no separators", () => {
    const ics = renderIcs("Cal", "d", [occ()]);
    expect(ics).toContain("DTSTART;TZID=America/New_York:20260603T213000");
    expect(ics).toContain("DTEND;TZID=America/New_York:20260603T233000");
  });

  it("defaults end to start + 2h when endTime is absent", () => {
    const ics = renderIcs("Cal", "d", [occ({ endTime: undefined, startTime: "21:30" })]);
    expect(ics).toContain("DTSTART;TZID=America/New_York:20260603T213000");
    expect(ics).toContain("DTEND;TZID=America/New_York:20260603T233000");
  });

  it("rolls the default end onto the next day past midnight", () => {
    const ics = renderIcs("Cal", "d", [occ({ endTime: undefined, startTime: "23:30" })]);
    // 23:30 + 2h = 01:30 the next day
    expect(ics).toContain("DTSTART;TZID=America/New_York:20260603T233000");
    expect(ics).toContain("DTEND;TZID=America/New_York:20260604T013000");
  });

  it("zero-pads single-digit hours and minutes", () => {
    const ics = renderIcs("Cal", "d", [occ({ startTime: "9:05", endTime: "9:30" })]);
    expect(ics).toContain("DTSTART;TZID=America/New_York:20260603T090500");
    expect(ics).toContain("DTEND;TZID=America/New_York:20260603T093000");
  });
});

describe("renderIcs — UID & content", () => {
  it("builds a UID from occurrence id + host", () => {
    const ics = renderIcs("Cal", "d", [occ()]);
    expect(ics).toContain("UID:wed-jam@2026-06-03@bandstand-bay.vercel.app");
  });

  it("puts name and venue in SUMMARY and venue+address in LOCATION", () => {
    const ics = renderIcs("Cal", "d", [occ()]);
    expect(ics).toContain("SUMMARY:Wednesday Jam — Heritage");
    expect(ics).toContain("LOCATION:Heritage\\, 914 N 2nd St");
  });

  it("adds a Confidence line to DESCRIPTION when not verified", () => {
    const ics = renderIcs("Cal", "d", [occ({ confidence: "likely" })]);
    expect(ics).toContain("Confidence: likely");
  });

  it("omits DESCRIPTION when there is nothing to say", () => {
    // No notes, no ticket, no sit-in, verified, and a venue with no website.
    const bare = renderIcs("Cal", "d", [
      occ({ venue: { ...venue, website: undefined } }),
    ]);
    const evLines = lines(bare).filter((l) => l.startsWith("DESCRIPTION"));
    expect(evLines).toHaveLength(0);
  });

  it("emits URL from ticketUrl, falling back to venue website", () => {
    const withTicket = renderIcs("Cal", "d", [
      occ({ ticketUrl: "https://tix.example/e" }),
    ]);
    expect(withTicket).toContain("URL:https://tix.example/e");
    const noTicket = renderIcs("Cal", "d", [occ()]);
    expect(noTicket).toContain("URL:https://heritage.example");
  });
});

describe("renderIcs — RFC 5545 escaping", () => {
  it("escapes commas, semicolons, backslashes and newlines in text", () => {
    const ics = renderIcs("Cal", "d", [
      occ({ name: "Trio, Quartet; Band\\Ensemble", notes: "line one\nline two" }),
    ]);
    expect(ics).toContain("SUMMARY:Trio\\, Quartet\\; Band\\\\Ensemble — Heritage");
    expect(ics).toContain("DESCRIPTION:line one\\nline two");
  });

  it("does not leave a raw comma unescaped in LOCATION", () => {
    const ics = renderIcs("Cal", "d", [occ()]);
    const loc = lines(ics).find((l) => l.startsWith("LOCATION"))!;
    // the only comma is the escaped one between name and address
    expect(loc).not.toMatch(/[^\\],/);
  });
});
