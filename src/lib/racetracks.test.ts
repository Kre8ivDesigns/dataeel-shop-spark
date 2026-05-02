import { describe, expect, it } from "vitest";
import { extractCanonicalTrackCode, getRacetrackLabel, normalizeTrackCode } from "./racetracks";

describe("getRacetrackLabel", () => {
  const churchill = "Churchill Downs";

  it("maps CD to Churchill Downs", () => {
    expect(getRacetrackLabel("CD")).toBe(churchill);
  });

  it("uppercases cd", () => {
    expect(getRacetrackLabel("cd")).toBe(churchill);
  });

  it("strips trailing caret from CD^", () => {
    expect(getRacetrackLabel("CD^")).toBe(churchill);
  });

  it("does not throw on null or undefined track codes", () => {
    expect(getRacetrackLabel(null)).toBe("Track");
    expect(getRacetrackLabel(undefined)).toBe("Track");
  });
});

describe("normalizeTrackCode", () => {
  it("returns empty string for nullish input", () => {
    expect(normalizeTrackCode(null)).toBe("");
    expect(normalizeTrackCode(undefined)).toBe("");
  });
});

describe("extractCanonicalTrackCode", () => {
  it("handles nullish without throwing", () => {
    expect(extractCanonicalTrackCode(null)).toBe("");
    expect(extractCanonicalTrackCode(undefined)).toBe("");
  });
});
