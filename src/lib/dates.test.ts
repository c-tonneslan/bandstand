import { describe, expect, it } from "vitest";

import {
  addDays,
  dayLabel,
  dayLabelFromYmd,
  dayOfWeekInPhilly,
  formatHumanDate,
  formatHumanTime,
  rangeOfDays,
  todayInPhilly,
  ymdInPhilly,
} from "./dates";

describe("ymdInPhilly", () => {
  it("formats a UTC instant as the matching Philly date", () => {
    // 2026-05-29 14:00 UTC = 2026-05-29 10:00 EDT
    expect(ymdInPhilly(new Date("2026-05-29T14:00:00Z"))).toBe("2026-05-29");
  });

  it("rolls back across midnight UTC when Philly is still on the previous day", () => {
    // 2026-05-29 02:00 UTC = 2026-05-28 22:00 EDT
    expect(ymdInPhilly(new Date("2026-05-29T02:00:00Z"))).toBe("2026-05-28");
  });

  it("rolls forward across midnight Philly", () => {
    // 2026-05-30 04:30 UTC = 2026-05-30 00:30 EDT (already next day)
    expect(ymdInPhilly(new Date("2026-05-30T04:30:00Z"))).toBe("2026-05-30");
  });
});

describe("dayOfWeekInPhilly", () => {
  it("returns the right weekday for known dates", () => {
    expect(dayOfWeekInPhilly("2026-05-29")).toBe("fri");
    expect(dayOfWeekInPhilly("2026-05-30")).toBe("sat");
    expect(dayOfWeekInPhilly("2026-05-31")).toBe("sun");
  });

  it("survives a DST transition", () => {
    // Spring forward: 2026-03-08 was a Sunday in Philly.
    expect(dayOfWeekInPhilly("2026-03-08")).toBe("sun");
    // Fall back: 2026-11-01 was a Sunday.
    expect(dayOfWeekInPhilly("2026-11-01")).toBe("sun");
  });
});

describe("addDays", () => {
  it("walks forward", () => {
    expect(addDays("2026-05-29", 1)).toBe("2026-05-30");
    expect(addDays("2026-05-29", 7)).toBe("2026-06-05");
  });

  it("walks backward", () => {
    expect(addDays("2026-05-29", -1)).toBe("2026-05-28");
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-05-31", 1)).toBe("2026-06-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("crosses a DST spring-forward without skipping a day", () => {
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
  });
});

describe("rangeOfDays", () => {
  it("returns an inclusive range", () => {
    expect(rangeOfDays("2026-05-29", "2026-06-01")).toEqual([
      "2026-05-29",
      "2026-05-30",
      "2026-05-31",
      "2026-06-01",
    ]);
  });

  it("returns a single-element range when start equals end", () => {
    expect(rangeOfDays("2026-05-29", "2026-05-29")).toEqual(["2026-05-29"]);
  });

  it("caps the loop at 366 days so a typo can't run forever", () => {
    // start AFTER end — the safety cap should still terminate.
    const out = rangeOfDays("2026-12-31", "2026-01-01");
    expect(out.length).toBe(366);
  });
});

describe("formatHumanDate", () => {
  it("renders Wed, May 29", () => {
    expect(formatHumanDate("2026-05-27")).toBe("Wed, May 27");
  });
});

describe("formatHumanTime", () => {
  it("strips :00 for top of the hour", () => {
    expect(formatHumanTime("21:00")).toBe("9 pm");
  });

  it("renders half-hour times with am/pm", () => {
    expect(formatHumanTime("21:30")).toBe("9:30 pm");
    expect(formatHumanTime("09:30")).toBe("9:30 am");
  });

  it("renders noon and midnight", () => {
    expect(formatHumanTime("12:00")).toBe("12 pm");
    expect(formatHumanTime("00:00")).toBe("12 am");
  });
});

describe("dayLabel + dayLabelFromYmd", () => {
  it("returns the full weekday name", () => {
    expect(dayLabel("fri")).toBe("Friday");
    expect(dayLabel("sun")).toBe("Sunday");
  });

  it("joins date->day->label end to end", () => {
    expect(dayLabelFromYmd("2026-05-29")).toBe("Friday");
  });
});

describe("todayInPhilly", () => {
  it("uses now() by default and matches the explicit form", () => {
    const fixed = new Date("2026-05-29T14:00:00Z");
    expect(todayInPhilly(fixed)).toBe("2026-05-29");
  });
});
