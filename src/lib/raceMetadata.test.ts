import { describe, expect, it } from "vitest";
import { metadataListingLine, parseRacecardMetadata } from "./raceMetadata";

describe("parseRacecardMetadata", () => {
  it("returns empty object for null", () => {
    expect(parseRacecardMetadata(null)).toEqual({});
  });

  it("parses weather and first post into listing line", () => {
    const meta = parseRacecardMetadata({
      first_post_display: "1:00 PM ET",
      weather: { summary: "Clear" },
      track_condition: "Fast",
    });
    expect(metadataListingLine(meta)).toBe("1:00 PM ET · Clear · Fast");
  });
});
