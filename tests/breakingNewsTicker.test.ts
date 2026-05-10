import { describe, expect, it } from "vitest";
import { buildTickerLoopItems, tickerDurationSeconds } from "@/lib/breakingNewsTicker";

describe("buildTickerLoopItems", () => {
  it("repeats short breaking-news lists so the ticker does not scroll into empty space", () => {
    const items = buildTickerLoopItems(["First headline", "Second headline"], 8);

    expect(items).toHaveLength(8);
    expect(items.slice(0, 4)).toEqual(["First headline", "Second headline", "First headline", "Second headline"]);
  });

  it("drops blank rows before building the loop", () => {
    expect(buildTickerLoopItems(["  ", "Real headline"], 3)).toEqual([
      "Real headline",
      "Real headline",
      "Real headline",
    ]);
  });
});

describe("tickerDurationSeconds", () => {
  it("keeps ticker speed inside readable bounds", () => {
    expect(tickerDurationSeconds(["Short"])).toBe(90);
    expect(tickerDurationSeconds([`${"Long headline ".repeat(200)}`])).toBe(420);
  });
});
