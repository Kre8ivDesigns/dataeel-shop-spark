import { describe, expect, it } from "vitest";
import {
  buildTrackResultsRssXml,
  parseRssItems,
} from "../../supabase/functions/_shared/track_results_rss";

describe("buildTrackResultsRssXml", () => {
  it("builds rss with escaped title and valid items", () => {
    const xml = buildTrackResultsRssXml("GP", [
      {
        source_id: "src-1",
        track_code: "GP",
        track_name_raw: "Gulfstream Park",
        race_date: "2026-05-02",
        race_number: 3,
        result_title: "Race 3 - Winner & Place",
        result_summary: "Top 3 finishers",
        result_description: "Payout details <official>",
        source_url: "https://example.com/results/gp-race-3",
        source_pub_date: "2026-05-02T12:30:00.000Z",
      },
    ]);

    expect(xml).toContain("<rss version=\"2.0\">");
    expect(xml).toContain("Gulfstream Park Horse Racing Results");
    expect(xml).toContain("Winner &amp; Place");
    expect(xml).toContain("Payout details &lt;official&gt;");

    const parsedItems = parseRssItems(xml, 5);
    expect(parsedItems).toHaveLength(1);
    expect(parsedItems[0]?.title).toContain("Winner & Place");
    expect(parsedItems[0]?.link).toBe("https://example.com/results/gp-race-3");
  });
});
