import { useQuery } from "@tanstack/react-query";
import { ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseRss2Items } from "@/lib/parseRss2Xml";

const EQUIBASE_RSS_INFO = "https://www.equibase.com/static/latechanges/rss/KD-USA.rss";
const QUERY_KEY = ["equibase-late-changes-rss"] as const;
const MAX_ITEMS = 12;

/** Optional label for which track the Edge secret targets (e.g. Aqueduct). */
const TRACK_LABEL = import.meta.env.VITE_EQUIBASE_LATE_CHANGES_TRACK_LABEL?.trim() || null;

async function fetchEquibaseLateChanges(): Promise<ReturnType<typeof parseRss2Items>> {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) {
    throw new Error("Missing Supabase env");
  }
  const res = await fetch(`${base}/functions/v1/equibase-late-changes-rss`, {
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
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EquibaseLateChangesSection() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchEquibaseLateChanges,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });

  const heading = TRACK_LABEL
    ? `Scratches & changes · ${TRACK_LABEL}`
    : "Scratches & changes (Equibase)";

  return (
    <section id="equibase-late-changes" className="py-20 bg-background border-y border-border">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground font-heading flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-amber-500 shrink-0" aria-hidden />
            {heading}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl">
            Official-style late changes from Equibase static RSS (scratches, track condition, wagering updates). For
            informational use only — always confirm at the track or on Equibase before wagering.
          </p>
        </div>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground">Equibase late changes feed</CardTitle>
            <CardDescription>
              Track code is set with Supabase secret{" "}
              <code className="text-xs bg-muted px-1 rounded">EQUIBASE_LATE_CHANGES_BRN</code> (e.g.{" "}
              <code className="text-xs bg-muted px-1 rounded">KD-USA</code>,{" "}
              <code className="text-xs bg-muted px-1 rounded">SA-USA</code>).{" "}
              <a
                href={EQUIBASE_RSS_INFO}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Example RSS <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading late changes" />
              </div>
            ) : isError ? (
              <div className="text-center py-10 space-y-3">
                <p className="text-sm text-muted-foreground">Couldn&apos;t load the Equibase feed.</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Try again
                </button>
                <p className="text-xs text-muted-foreground">
                  Deploy the <code className="bg-muted px-1 rounded">equibase-late-changes-rss</code> Edge Function if
                  you haven&apos;t yet.
                </p>
              </div>
            ) : !data?.length ? (
              <p className="text-sm text-muted-foreground text-center py-10">No items in the feed right now.</p>
            ) : (
              <ul className="divide-y divide-border space-y-0">
                {data.map((item, i) => (
                  <li key={`${item.link}-${item.pubDate ?? ""}-${i}`} className="py-4 first:pt-0 last:pb-0">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group hover:text-primary transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                        <span className="font-medium text-foreground group-hover:text-primary">{item.title}</span>
                        {formatPubDate(item.pubDate) ? (
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                            {formatPubDate(item.pubDate)}
                          </span>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-4 leading-relaxed">
                          {item.description}
                        </p>
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
