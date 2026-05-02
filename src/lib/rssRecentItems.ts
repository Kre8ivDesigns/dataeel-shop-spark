import type { Rss2Item } from "@/lib/parseRss2Xml";

/** Dashboard RSS blocks hide items older than this many days (compare `pubDate` to now). */
export const RSS_FEED_MAX_AGE_DAYS = 30;

const MS_PER_DAY = 86_400_000;

/**
 * Keeps RSS items whose `pubDate` parses to a timestamp within the last `maxAgeDays` days.
 * Items with missing or unparseable `pubDate` are dropped so stale undated entries are not shown.
 */
export function filterRssItemsNewerThanDays(
  items: Rss2Item[],
  maxAgeDays: number,
  nowMs: number = Date.now(),
): Rss2Item[] {
  const cutoff = nowMs - maxAgeDays * MS_PER_DAY;
  return items.filter((item) => {
    const raw = item.pubDate?.trim();
    if (!raw) return false;
    const t = new Date(raw).getTime();
    if (Number.isNaN(t)) return false;
    return t >= cutoff;
  });
}
