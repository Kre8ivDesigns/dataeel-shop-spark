import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Newspaper, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseRss2Items } from "@/lib/parseRss2Xml";

const ABR_HOME = "https://www.americasbestracing.net/";
const ABR_RSS_SOURCE = "https://www.americasbestracing.net/the-sport/rss";
const QUERY_KEY = ["abr-rss-the-sport"] as const;
const MAX_ITEMS = 8;

async function fetchAbrSportFeed(): Promise<ReturnType<typeof parseRss2Items>> {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) {
    throw new Error("Missing Supabase env");
  }
  const res = await fetch(`${base}/functions/v1/abr-rss`, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Feed request failed: ${res.status}`);
  }
  const xml = await res.text();
  return parseRss2Items(xml, MAX_ITEMS);
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
    queryFn: fetchAbrSportFeed,
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    retry: 1,
  });

  return (
    <section id="racing-headlines" className="py-20 bg-muted/30 border-y border-border">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-heading flex items-center gap-2">
              <Newspaper className="h-8 w-8 text-primary shrink-0" aria-hidden />
              Racing headlines
            </h2>
            <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-xl">
              Latest stories from America&apos;s Best Racing (&quot;The Sport&quot; feed). Links open in a new tab.
            </p>
          </div>
        </div>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground">America&apos;s Best Racing</CardTitle>
            <CardDescription>
              Syndicated via RSS for convenience. Dataeel is not affiliated with ABR.{" "}
              <a
                href={ABR_RSS_SOURCE}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                RSS source <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
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
                  directly.
                </p>
              </div>
            ) : !data?.length ? (
              <p className="text-sm text-muted-foreground text-center py-10">No stories in the feed at the moment.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.map((item) => (
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
