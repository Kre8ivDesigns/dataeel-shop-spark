import { describe, expect, it } from "vitest";
import { trackHeroImageSearchQuery } from "./trackHeroImage";

describe("trackHeroImageSearchQuery", () => {
  it("includes city and state when location is known", () => {
    const q = trackHeroImageSearchQuery("GP");
    expect(q).toContain("Gulfstream");
    expect(q.toLowerCase()).toContain("horse racing");
  });

  it("falls back to label racetrack for canonical code without DB location", () => {
    const q = trackHeroImageSearchQuery("XX_UNKNOWN_CODE");
    expect(q.length).toBeGreaterThan(3);
    expect(q.toLowerCase()).toMatch(/racetrack|horse racing/);
  });

  it("handles null without throwing", () => {
    expect(() => trackHeroImageSearchQuery(null)).not.toThrow();
    expect(trackHeroImageSearchQuery(null).length).toBeGreaterThan(0);
  });
});
