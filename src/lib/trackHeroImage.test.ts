import { describe, expect, it } from "vitest";
import { getTrackHeroImage } from "./trackHeroImage";

describe("getTrackHeroImage", () => {
  it("returns the matching local image for canonical track codes", () => {
    const url = getTrackHeroImage("GP^");
    expect(url).toContain("track-hero-gp.png");
  });

  it("normalizes caret-suffixed track codes", () => {
    const url = getTrackHeroImage("CD^");
    expect(url).toContain("track-hero-cd.png");
  });

  it("falls back to a generic race image for unknown codes", () => {
    const url = getTrackHeroImage("XX_UNKNOWN_CODE");
    expect(url).toMatch(/track-hero-generic-(dirt|turf|weather)\.png/);
  });

  it("handles null without throwing", () => {
    expect(() => getTrackHeroImage(null)).not.toThrow();
    expect(getTrackHeroImage(null)).toMatch(/track-hero-generic-(dirt|turf|weather)\.png/);
  });
});
