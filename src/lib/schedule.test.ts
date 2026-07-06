import { describe, expect, it } from "vitest";

import type { Event, Override, Series, Venue } from "@/data/types";

import { groupByDate, lastScrapedAt, resolveOccurrences } from "./schedule";

const venue: Venue = {
  slug: "heritage",
  name: "Heritage",
  neighborhood: "Northern Liberties",
  address: "914 N 2nd St",
  lat: 39.96,
  lng: -75.14,
  website: "https://heritage.example",
  blurb: "A plant shop that turns into a jazz room.",
  vibe: "Loud, warm, packed.",
  cover: "free",
  tags: ["live-jazz", "jam-session"],
};

const otherVenue: Venue = {
  ...venue,
  slug: "chris",
  name: "Chris' Jazz Cafe",
};

const wedJam: Series = {
  id: "wed-jam",
  venueSlug: "heritage",
  name: "Wednesday Jam",
  day: "wed",
  startTime: "21:30",
  endTime: "01:00",
  kind: "jam",
  sitInPolicy: "first-half-then-open",
  confidence: "verified",
};

function baseInput() {
  return {
    start: "2026-06-01", // Monday
    end: "2026-06-30", // Tuesday
    series: [wedJam],
    events: [] as Event[],
    overrides: [] as Override[],
    venues: [venue, otherVenue],
  };
}

describe("resolveOccurrences — weekly series", () => {
  it("emits one occurrence per matching weekday in range", () => {
    const occ = resolveOccurrences(baseInput());
    // Wednesdays in June 2026: 3, 10, 17, 24
    expect(occ.map((o) => o.date)).toEqual([
      "2026-06-03",
      "2026-06-10",
      "2026-06-17",
      "2026-06-24",
    ]);
    expect(occ.every((o) => o.source === "series")).toBe(true);
  });

  it("copies series fields onto each occurrence", () => {
    const [o] = resolveOccurrences(baseInput());
    expect(o.id).toBe("wed-jam@2026-06-03");
    expect(o.name).toBe("Wednesday Jam");
    expect(o.startTime).toBe("21:30");
    expect(o.endTime).toBe("01:00");
    expect(o.kind).toBe("jam");
    expect(o.venue.slug).toBe("heritage");
  });

  it("emits nothing when no weekday matches in range", () => {
    const occ = resolveOccurrences({
      ...baseInput(),
      start: "2026-06-04", // Thu
      end: "2026-06-09", // Tue — no Wednesday between
    });
    expect(occ).toEqual([]);
  });

  it("drops a series whose venue is unknown", () => {
    const occ = resolveOccurrences({
      ...baseInput(),
      series: [{ ...wedJam, venueSlug: "nonexistent" }],
    });
    expect(occ).toEqual([]);
  });
});

describe("resolveOccurrences — endedOn", () => {
  it("drops occurrences strictly after endedOn", () => {
    const occ = resolveOccurrences({
      ...baseInput(),
      series: [{ ...wedJam, endedOn: "2026-06-10" }],
    });
    expect(occ.map((o) => o.date)).toEqual(["2026-06-03", "2026-06-10"]);
  });

  it("keeps the occurrence landing exactly on endedOn", () => {
    const occ = resolveOccurrences({
      ...baseInput(),
      series: [{ ...wedJam, endedOn: "2026-06-17" }],
    });
    expect(occ.map((o) => o.date)).toContain("2026-06-17");
    expect(occ.map((o) => o.date)).not.toContain("2026-06-24");
  });
});

describe("resolveOccurrences — overrides", () => {
  it("cancelled removes that date's occurrence", () => {
    const occ = resolveOccurrences({
      ...baseInput(),
      overrides: [{ seriesId: "wed-jam", date: "2026-06-10", kind: "cancelled" }],
    });
    expect(occ.map((o) => o.date)).toEqual([
      "2026-06-03",
      "2026-06-17",
      "2026-06-24",
    ]);
  });

  it("replaced drops the series occurrence and lets the matching Event land", () => {
    const special: Event = {
      id: "special-night",
      venueSlug: "heritage",
      date: "2026-06-10",
      startTime: "20:00",
      name: "Special Guest Night",
      kind: "ticketed",
      confidence: "verified",
    };
    const occ = resolveOccurrences({
      ...baseInput(),
      events: [special],
      overrides: [{ seriesId: "wed-jam", date: "2026-06-10", kind: "replaced" }],
    });
    const onTenth = occ.filter((o) => o.date === "2026-06-10");
    expect(onTenth).toHaveLength(1);
    expect(onTenth[0].source).toBe("event");
    expect(onTenth[0].name).toBe("Special Guest Night");
  });

  it("ignores an override for a different series", () => {
    const occ = resolveOccurrences({
      ...baseInput(),
      overrides: [{ seriesId: "some-other-series", date: "2026-06-10", kind: "cancelled" }],
    });
    expect(occ.map((o) => o.date)).toContain("2026-06-10");
  });
});

describe("resolveOccurrences — one-off events", () => {
  it("includes events inside the range and drops those outside", () => {
    const events: Event[] = [
      {
        id: "in-range",
        venueSlug: "chris",
        date: "2026-06-05",
        startTime: "20:00",
        name: "In Range",
        kind: "ticketed",
        confidence: "verified",
      },
      {
        id: "out-of-range",
        venueSlug: "chris",
        date: "2026-07-05",
        startTime: "20:00",
        name: "Out Of Range",
        kind: "ticketed",
        confidence: "verified",
      },
    ];
    const occ = resolveOccurrences({ ...baseInput(), events });
    const names = occ.map((o) => o.name);
    expect(names).toContain("In Range");
    expect(names).not.toContain("Out Of Range");
  });

  it("dedupes by id, later entry wins (hand-curated over scraped)", () => {
    const scraped: Event = {
      id: "dup",
      venueSlug: "chris",
      date: "2026-06-05",
      startTime: "20:00",
      name: "Scraped Version",
      kind: "ticketed",
      confidence: "unverified",
    };
    const curated: Event = {
      ...scraped,
      name: "Curated Version",
      confidence: "verified",
    };
    // scraped first, curated later — mirrors [...scrapedEvents(), ...defaultEvents]
    const occ = resolveOccurrences({ ...baseInput(), events: [scraped, curated] });
    const dup = occ.filter((o) => o.id === "dup");
    expect(dup).toHaveLength(1);
    expect(dup[0].name).toBe("Curated Version");
    expect(dup[0].confidence).toBe("verified");
  });

  it("drops an event whose venue is unknown", () => {
    const occ = resolveOccurrences({
      ...baseInput(),
      events: [
        {
          id: "orphan",
          venueSlug: "nowhere",
          date: "2026-06-05",
          startTime: "20:00",
          name: "Orphan",
          kind: "ticketed",
          confidence: "verified",
        },
      ],
    });
    expect(occ.map((o) => o.name)).not.toContain("Orphan");
  });
});

describe("resolveOccurrences — sorting & timezone", () => {
  it("sorts by date then start time", () => {
    const late: Event = {
      id: "late",
      venueSlug: "chris",
      date: "2026-06-03",
      startTime: "23:00",
      name: "Late",
      kind: "jam",
      confidence: "verified",
    };
    const early: Event = {
      id: "early",
      venueSlug: "chris",
      date: "2026-06-03",
      startTime: "18:00",
      name: "Early",
      kind: "ticketed",
      confidence: "verified",
    };
    const occ = resolveOccurrences({ ...baseInput(), events: [late, early] });
    const onThird = occ.filter((o) => o.date === "2026-06-03");
    // series jam at 21:30 sits between early (18:00) and late (23:00)
    expect(onThird.map((o) => o.startTime)).toEqual(["18:00", "21:30", "23:00"]);
  });

  it("lands the occurrence on the correct Philly local date", () => {
    // A near-midnight late jam should still be filed under its local calendar
    // date, not shift a day via UTC. wed-jam starts 21:30 on Wednesdays.
    const occ = resolveOccurrences({
      ...baseInput(),
      start: "2026-06-03",
      end: "2026-06-03",
    });
    expect(occ).toHaveLength(1);
    expect(occ[0].date).toBe("2026-06-03");
  });
});

describe("groupByDate", () => {
  it("groups occurrences by their date preserving order", () => {
    const occ = resolveOccurrences(baseInput());
    const grouped = groupByDate(occ);
    expect([...grouped.keys()]).toEqual([
      "2026-06-03",
      "2026-06-10",
      "2026-06-17",
      "2026-06-24",
    ]);
    expect(grouped.get("2026-06-03")).toHaveLength(1);
  });

  it("puts multiple same-day occurrences in one bucket", () => {
    const extra: Event = {
      id: "extra",
      venueSlug: "chris",
      date: "2026-06-03",
      startTime: "19:00",
      name: "Extra",
      kind: "ticketed",
      confidence: "verified",
    };
    const grouped = groupByDate(
      resolveOccurrences({ ...baseInput(), events: [extra] }),
    );
    expect(grouped.get("2026-06-03")).toHaveLength(2);
  });

  it("returns an empty map for no occurrences", () => {
    expect(groupByDate([]).size).toBe(0);
  });
});

describe("lastScrapedAt", () => {
  it("returns the generatedAt timestamp from the scraped file", () => {
    const at = lastScrapedAt();
    expect(typeof at).toBe("string");
    expect(at.length).toBeGreaterThan(0);
  });
});
