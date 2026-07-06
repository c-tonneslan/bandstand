import { describe, expect, it } from "vitest";

import { artistSlug } from "./artists";

describe("artistSlug", () => {
  it("kebab-cases and strips punctuation", () => {
    expect(artistSlug("Orrin Evans")).toBe("orrin-evans");
    expect(artistSlug("Chris' Trio")).toBe("chris-trio");
    expect(artistSlug("  McCoy   Tyner  ")).toBe("mccoy-tyner");
  });

  it("is stable across casing and spacing", () => {
    expect(artistSlug("The Bad Plus")).toBe(artistSlug("the bad  plus"));
  });
});
