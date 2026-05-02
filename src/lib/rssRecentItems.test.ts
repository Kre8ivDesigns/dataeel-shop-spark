import { describe, expect, it } from "vitest";
import type { Rss2Item } from "@/lib/parseRss2Xml";
import { filterRssItemsNewerThanDays, RSS_FEED_MAX_AGE_DAYS } from "./rssRecentItems";

describe("filterRssItemsNewerThanDays", () => {
  const fixedNow = new Date("2026-05-02T12:00:00.000Z").getTime();

  it("keeps items within the window", () => {
    const items: Rss2Item[] = [
      { title: "a", link: "https://a", pubDate: "Wed, 30 Apr 2026 12:00:00 GMT" },
      { title: "b", link: "https://b", pubDate: "Thu, 01 May 2026 08:00:00 +0000" },
    ];
    const out = filterRssItemsNewerThanDays(items, RSS_FEED_MAX_AGE_DAYS, fixedNow);
    expect(out).toHaveLength(2);
  });

  it("drops items older than maxAgeDays", () => {
    const items: Rss2Item[] = [
      { title: "old", link: "https://old", pubDate: "Mon, 01 Apr 2026 12:00:00 GMT" },
      { title: "new", link: "https://new", pubDate: "Sun, 01 May 2026 12:00:00 GMT" },
    ];
    const out = filterRssItemsNewerThanDays(items, RSS_FEED_MAX_AGE_DAYS, fixedNow);
    expect(out.map((i) => i.title)).toEqual(["new"]);
  });

  it("drops items without pubDate", () => {
    const items: Rss2Item[] = [{ title: "x", link: "https://x" }];
    expect(filterRssItemsNewerThanDays(items, 30, fixedNow)).toHaveLength(0);
  });

  it("drops items with invalid pubDate", () => {
    const items: Rss2Item[] = [{ title: "x", link: "https://x", pubDate: "not-a-date" }];
    expect(filterRssItemsNewerThanDays(items, 30, fixedNow)).toHaveLength(0);
  });
});
