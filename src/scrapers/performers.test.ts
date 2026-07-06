import { describe, expect, it } from "vitest";

import { parseCommaPersonnel, parseDashPersonnel } from "./performers";

describe("parseDashPersonnel", () => {
  it("pulls names out of a real South-format note", () => {
    const note =
      "Gabriel Meyer - Trombone · Caleb Wheeler Curtis - Stritch, Sopranino, Trumpet · Jake Miller - Guitar · Josh Klamka - Keys · Eli Pace - Bass · Greg Masters - Drums";
    expect(parseDashPersonnel(note)).toEqual([
      "Gabriel Meyer",
      "Caleb Wheeler Curtis",
      "Jake Miller",
      "Josh Klamka",
      "Eli Pace",
      "Greg Masters",
    ]);
  });

  it("returns [] for a show-times / pricing note", () => {
    const note =
      "Show Times: 7:30pm & 9:30pm · General Admission ~ a la carte menu: $25 · Dinner & Show package ~ includes 3-course dinner: $100";
    expect(parseDashPersonnel(note)).toEqual([]);
  });
});

describe("parseCommaPersonnel", () => {
  it("pulls names from a real Chris-format note and drops the trailing prose", () => {
    const note =
      "Jonathan Paik, piano · Hannah Marks, double bass · Mark Valdes, drums Two sets: 7:30pm, 9pm.";
    expect(parseCommaPersonnel(note)).toEqual([
      "Jonathan Paik",
      "Hannah Marks",
      "Mark Valdes",
    ]);
  });

  it("reads names whichever side of the comma the person is on", () => {
    const note = "Vocals, Declan Cashman · Piano, Aidan Ward-Richter · Bass, Paul Briggs";
    expect(parseCommaPersonnel(note)).toEqual([
      "Declan Cashman",
      "Aidan Ward-Richter",
      "Paul Briggs",
    ]);
  });

  it("handles multi-word instruments and missing spaces", () => {
    const note =
      "Ravi Seenarine, voice and tenor sax · Lonell Johnson, piano/keys · Ben Cohen,drums";
    expect(parseCommaPersonnel(note)).toEqual([
      "Ravi Seenarine",
      "Lonell Johnson",
      "Ben Cohen",
    ]);
  });

  it("returns [] for a pricing / show-times note", () => {
    const note =
      "Show Times: 7:30pm & 9:30pm · General Admission ~ a la carte menu: $25 · Dinner & Show package ~ includes 3-course dinner: $100";
    expect(parseCommaPersonnel(note)).toEqual([]);
  });
});
