import { describe, expect, it } from "vitest";

import type { Event, Override, Series, Venue } from "@/data/types";

import { validateData, validateRealData, type ValidateInput } from "./validate";

// A minimal, valid baseline. Each test clones this and breaks exactly one thing.
const venue: Venue = {
  slug: "heritage",
  name: "Heritage",
  neighborhood: "Northern Liberties",
  address: "914 N 2nd St, Philadelphia, PA 19123",
  lat: 39.9657,
  lng: -75.1404,
  blurb: "b",
  vibe: "v",
  cover: "free",
  tags: ["live-jazz", "jam-session"],
};

const seriesItem: Series = {
  id: "heritage-wed-jam",
  venueSlug: "heritage",
  name: "Wednesday Jam",
  day: "wed",
  startTime: "21:30",
  endTime: "01:00",
  kind: "jam",
  sitInPolicy: "first-half-then-open",
  confidence: "verified",
  verifiedAt: "2026-05-29",
};

const eventItem: Event = {
  id: "solar-2026-05-31",
  venueSlug: "heritage",
  date: "2026-05-31",
  startTime: "20:00",
  endTime: "22:30",
  name: "Show",
  kind: "ticketed",
  confidence: "unverified",
};

function baseline(): ValidateInput {
  return {
    venues: [structuredClone(venue)],
    series: [structuredClone(seriesItem)],
    events: [structuredClone(eventItem)],
    overrides: [],
  };
}

const codes = (input: ValidateInput) => validateData(input).map((i) => i.code);

describe("validateData — good input", () => {
  it("returns no issues for a clean baseline", () => {
    expect(validateData(baseline())).toEqual([]);
  });
});

describe("uniqueness", () => {
  it("flags duplicate venue slugs", () => {
    const input = baseline();
    input.venues.push(structuredClone(venue));
    expect(codes(input)).toContain("venue-slug-duplicate");
  });

  it("flags duplicate series ids", () => {
    const input = baseline();
    input.series.push(structuredClone(seriesItem));
    expect(codes(input)).toContain("series-id-duplicate");
  });

  it("flags duplicate event ids", () => {
    const input = baseline();
    input.events.push(structuredClone(eventItem));
    expect(codes(input)).toContain("event-id-duplicate");
  });
});

describe("referential integrity", () => {
  it("flags a series pointing at an unknown venue", () => {
    const input = baseline();
    input.series[0].venueSlug = "nope";
    expect(codes(input)).toContain("series-venue-missing");
  });

  it("flags an event pointing at an unknown venue", () => {
    const input = baseline();
    input.events[0].venueSlug = "nope";
    expect(codes(input)).toContain("event-venue-missing");
  });

  it("flags a scraped event pointing at an unknown venue", () => {
    const input = baseline();
    input.scrapedEvents = [{ ...structuredClone(eventItem), venueSlug: "nope" }];
    expect(codes(input)).toContain("event-venue-missing");
  });

  it("flags an override pointing at an unknown series", () => {
    const input = baseline();
    const bad: Override = { seriesId: "nope", date: "2026-05-31", kind: "cancelled" };
    input.overrides = [bad];
    expect(codes(input)).toContain("override-series-missing");
  });
});

describe("enums", () => {
  it("flags an invalid venue tag", () => {
    const input = baseline();
    // @ts-expect-error deliberately bad value
    input.venues[0].tags = ["not-a-tag"];
    expect(codes(input)).toContain("venue-tag-invalid");
  });

  it("flags an invalid day", () => {
    const input = baseline();
    // @ts-expect-error deliberately bad value
    input.series[0].day = "funday";
    expect(codes(input)).toContain("series-day-invalid");
  });

  it("flags an invalid kind", () => {
    const input = baseline();
    // @ts-expect-error deliberately bad value
    input.events[0].kind = "circus";
    expect(codes(input)).toContain("event-kind-invalid");
  });

  it("flags an invalid confidence", () => {
    const input = baseline();
    // @ts-expect-error deliberately bad value
    input.series[0].confidence = "maybe";
    expect(codes(input)).toContain("series-confidence-invalid");
  });

  it("flags an invalid sitInPolicy", () => {
    const input = baseline();
    // @ts-expect-error deliberately bad value
    input.series[0].sitInPolicy = "shout";
    expect(codes(input)).toContain("series-sitin-invalid");
  });
});

describe("geo", () => {
  it("errors when lat is outside [-90,90]", () => {
    const input = baseline();
    input.venues[0].lat = 120;
    const cs = codes(input);
    expect(cs).toContain("venue-lat-range");
    expect(cs).not.toContain("venue-lat-region");
  });

  it("errors when lng is outside [-180,180]", () => {
    const input = baseline();
    input.venues[0].lng = -200;
    expect(codes(input)).toContain("venue-lng-range");
  });

  it("warns (not errors) when a valid coord is outside the Philly box", () => {
    const input = baseline();
    input.venues[0].lat = 34.05; // Los Angeles latitude, still a legal lat
    const issues = validateData(input);
    const region = issues.find((i) => i.code === "venue-lat-region");
    expect(region?.severity).toBe("warning");
  });
});

describe("times and dates", () => {
  it("flags a malformed startTime", () => {
    const input = baseline();
    input.series[0].startTime = "9pm";
    expect(codes(input)).toContain("series-starttime-format");
  });

  it("flags an out-of-range clock time", () => {
    const input = baseline();
    input.series[0].startTime = "25:00";
    expect(codes(input)).toContain("series-starttime-format");
  });

  it("flags a malformed event date", () => {
    const input = baseline();
    input.events[0].date = "May 31 2026";
    expect(codes(input)).toContain("event-date-format");
  });

  it("accepts an ISO-timestamp verifiedAt on a scraped event", () => {
    const input = baseline();
    input.scrapedEvents = [
      { ...structuredClone(eventItem), verifiedAt: "2026-07-06T20:12:28.749Z" },
    ];
    expect(codes(input)).not.toContain("event-verifiedat-format");
  });
});

describe("overrides", () => {
  it("flags an invalid override kind", () => {
    const input = baseline();
    // one valid series so only the kind is wrong
    // @ts-expect-error deliberately bad value
    input.overrides = [{ seriesId: seriesItem.id, date: "2026-05-31", kind: "postponed" }];
    expect(codes(input)).toContain("override-kind-invalid");
  });
});

// The real guard: committed data must have ZERO errors. Warnings are allowed.
describe("real committed data", () => {
  it("has no errors", () => {
    const issues = validateRealData();
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });
});
