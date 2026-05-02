import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseRss2ChannelTitle, parseRss2Items, type Rss2Item } from "@/lib/parseRss2Xml";
import { filterRssItemsNewerThanDays, RSS_FEED_MAX_AGE_DAYS } from "@/lib/rssRecentItems";

const QUERY_KEY = ["dashboard-racing-results-feed"] as const;
const MAX_ITEMS = 12;
/** Parse more than we display so age filtering still yields up to MAX_ITEMS recent entries. */
const MAX_PARSE_ITEMS = 80;

type FeedResult = {
  items: Rss2Item[];
  source: "otb" | "hrn";
  channelTitle: string | null;
};

async function fetchFunctionXml(functionName: string, base: string, key: string): Promise<string> {
  const res = await fetch(`${base}/functions/v1/${functionName}`, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Feed request failed: ${res.status}`);
  }
  return res.text();
}

function takeRecentFeedItems(xml: string): Rss2Item[] {
  const parsed = parseRss2Items(xml, MAX_PARSE_ITEMS);
  return filterRssItemsNewerThanDays(parsed, RSS_FEED_MAX_AGE_DAYS).slice(0, MAX_ITEMS);
}

async function fetchRacingResultsFeed(): Promise<FeedResult> {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) {
    throw new Error("Missing Supabase env");
  }

  try {
    const xml = await fetchFunctionXml("otb-results-rss", base, key);
    const items = takeRecentFeedItems(xml);
    if (items.length > 0) {
      return {
        items,
        source: "otb",
        channelTitle: parseRss2ChannelTitle(xml),
      };
    }
  } catch {
    /* try fallback */
  }

  const hrnXml = await fetchFunctionXml("hrn-headlines-rss", base, key);
  return {
    items: takeRecentFeedItems(hrnXml),
    source: "hrn",
    channelTitle: parseRss2ChannelTitle(hrnXml),
  };
}

function formatPubDate(pubDate?: string): string | null {
  if (!pubDate) return null;
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return pubDate;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Logged-in dashboard: recent North American results via syndicated RSS (OTB first; Horse-Races.net fallback).
 * Only items from the last {@link RSS_FEED_MAX_AGE_DAYS} days are shown.
 */
export function DashboardRacingResultsSection() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchRacingResultsFeed,
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    retry: 1,
  });

  return (
    <section className="flex flex-col min-h-0 md:min-h-[280px]">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground font-heading">Recent racing results</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {data?.source === "otb"
                ? "Major North American tracks (OffTrackBetting.com results RSS)."
                : data?.source === "hrn"
                  ? "Headlines feed from Horse-Races.net (fallback when results RSS is unavailable)."
                  : "Major tracks and racing headlines via RSS."}{" "}
              <span className="text-muted-foreground/90">Showing entries from the last {RSS_FEED_MAX_AGE_DAYS} days.</span>
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 self-start" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      <div className="card-dark flex flex-col flex-1 min-h-[200px] overflow-hidden">
        {data?.channelTitle ? (
          <p className="text-xs text-muted-foreground px-4 pt-4 pb-3 font-medium border-b border-border/60">
            {data.channelTitle}
          </p>
        ) : null}

        <div className="flex-1 px-1 sm:px-2 pt-4 pb-4">
          {isLoading && (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          )}
          {isError && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-6 px-2">
              Results feed unavailable. Try again later.
            </p>
          )}
          {!isLoading && !isError && data && data.items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6 px-2">
              No entries from the last {RSS_FEED_MAX_AGE_DAYS} days.
            </p>
          )}
          {!isLoading && !isError && data && data.items.length > 0 && (
            <ul className="divide-y divide-border/80">
              {data.items.map((item, i) => (
                <li key={`${item.link}-${i}`} className="py-3 first:pt-0 last:pb-0 px-1">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-3 items-start text-left hover:opacity-95"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="font-medium text-foreground text-sm group-hover:text-primary transition-colors line-clamp-2">
                        {item.title}
                      </span>
                      {item.description ? (
                        <span className="block text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</span>
                      ) : null}
                      {formatPubDate(item.pubDate) ? (
                        <span className="block text-[11px] text-muted-foreground/80 mt-1">{formatPubDate(item.pubDate)}</span>
                      ) : null}
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 opacity-70 group-hover:opacity-100" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground px-4 pb-4 pt-0 border-t border-border/60 leading-relaxed">
          Syndicated third-party RSS for convenience. DATAEEL is not affiliated with OffTrackBetting, Horse-Races.net,
          or linked sites. Odds &amp; results on destination pages may differ from your jurisdiction or tote.
        </p>
      </div>
    </section>
  );
}
