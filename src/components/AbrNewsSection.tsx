import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Newspaper, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseRss2ChannelTitle, parseRss2Items, type Rss2Item } from "@/lib/parseRss2Xml";

const ABR_HOME = "https://www.americasbestracing.net/";
const ABR_RSS_SOURCE = "https://www.americasbestracing.net/rss/the-sport";
const TDN_HOME = "https://www.thoroughbreddailynews.com/";
const TDN_RSS_SOURCE = "https://www.thoroughbreddailynews.com/feed/";
const QUERY_KEY = ["us-racing-news-rss"] as const;
const MAX_ITEMS = 8;

type UsRacingFeed = { items: Rss2Item[]; source: "abr" | "tdn"; channelTitle: string | null };

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

async function fetchUsRacingNews(): Promise<UsRacingFeed> {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) {
    throw new Error("Missing Supabase env");
  }
  let abrItems: Rss2Item[] = [];
  let abrXml: string | null = null;
  try {
    abrXml = await fetchFunctionXml("abr-rss", base, key);
    abrItems = parseRss2Items(abrXml, MAX_ITEMS);
  } catch {
    /* fall through to TDN */
  }
  if (abrItems.length > 0 && abrXml) {
    return {
      items: abrItems,
      source: "abr",
      channelTitle: parseRss2ChannelTitle(abrXml),
    };
  }
  const tdnXml = await fetchFunctionXml("tdn-rss", base, key);
  return {
    items: parseRss2Items(tdnXml, MAX_ITEMS),
    source: "tdn",
    channelTitle: parseRss2ChannelTitle(tdnXml),
  };
}

function formatPubDate(pubDate?: string): string | null {
  if (!pubDate) return null;
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return pubDate;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function AbrNewsSection() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchUsRacingNews,
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    retry: 1,
  });

  return (
    <section id="us-racing-news" className="py-20 bg-muted/30 border-y border-border">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-heading flex items-center gap-2">
              <Newspaper className="h-8 w-8 text-primary shrink-0" aria-hidden />
              US racing news
            </h2>
            <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-xl">
              US racing headlines (America’s Best Racing “The Sport”; if that feed is empty, Thoroughbred Daily News).
              Links open in a new tab.
            </p>
          </div>
        </div>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground">
              {data?.source === "tdn"
                ? data.channelTitle ?? "Thoroughbred Daily News"
                : data.channelTitle ?? "America’s Best Racing — The Sport"}
            </CardTitle>
            <CardDescription>
              {data?.source === "tdn" ? (
                <>
                  Syndicated via RSS (fallback). Dataeel is not affiliated with TDN.{" "}
                  <a
                    href={TDN_RSS_SOURCE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    RSS source <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </>
              ) : (
                <>
                  Syndicated via RSS for convenience. Dataeel is not affiliated with ABR.{" "}
                  <a
                    href={ABR_RSS_SOURCE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    RSS source <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading headlines" />
              </div>
            ) : isError ? (
              <div className="text-center py-10 space-y-3">
                <p className="text-sm text-muted-foreground">Couldn&apos;t load headlines right now.</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Try again
                </button>
                <p className="text-xs text-muted-foreground">
                  Or visit{" "}
                  <a href={ABR_HOME} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    americasbestracing.net
                  </a>{" "}
                  or{" "}
                  <a href={TDN_HOME} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    thoroughbreddailynews.com
                  </a>
                  .
                </p>
              </div>
            ) : !data?.items?.length ? (
              <p className="text-sm text-muted-foreground text-center py-10">No stories in the feed at the moment.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.items.map((item) => (
                  <li key={item.link} className="py-3 first:pt-0 last:pb-0">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 hover:text-primary transition-colors"
                    >
                      <span className="font-medium text-foreground group-hover:text-primary pr-2">{item.title}</span>
                      {formatPubDate(item.pubDate) ? (
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {formatPubDate(item.pubDate)}
                        </span>
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
