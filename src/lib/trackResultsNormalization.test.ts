import { describe, expect, it } from "vitest";
import {
  TARGET_RESULTS_TRACK_CODES,
  canonicalizeResultsTrackCode,
  resolveResultsTrackCode,
  resolveResultsTrackCodeFromText,
} from "../../supabase/functions/_shared/track_results";

describe("track results normalization", () => {
  it("keeps configured target track list non-empty", () => {
    expect(TARGET_RESULTS_TRACK_CODES.length).toBeGreaterThanOrEqual(28);
    expect(TARGET_RESULTS_TRACK_CODES).toContain("GP");
    expect(TARGET_RESULTS_TRACK_CODES).toContain("SAR");
  });

  it("canonicalizes alias track codes", () => {
    expect(canonicalizeResultsTrackCode("dm")).toBe("DMR");
    expect(canonicalizeResultsTrackCode("EL")).toBe("ELP");
    expect(canonicalizeResultsTrackCode("gpw")).toBe("GP");
  });

  it("resolves track from known alias names", () => {
    expect(resolveResultsTrackCodeFromText("Belmont at the Big A")).toBe("BAQ");
    expect(resolveResultsTrackCodeFromText("Mahoning Valley Race Course")).toBe("MVR");
    expect(resolveResultsTrackCodeFromText("Del Mar Results")).toBe("DMR");
  });

  it("resolves track from title/description payload", () => {
    const code = resolveResultsTrackCode({
      title: "Race 3 Results - Tampa Bay Downs",
      description: "Final order and payout details",
    });
    expect(code).toBe("TAM");
  });
});
