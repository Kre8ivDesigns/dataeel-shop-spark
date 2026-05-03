import { useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useTrackResultsFeed } from "@/lib/queries/trackResultsFeed";
import { getTargetResultsTrackOptions } from "@/lib/resultsTracks";
import { Button } from "@/components/ui/button";

function formatPubDate(value?: string): string {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function DashboardRacingResultsSection() {
  const trackOptions = useMemo(() => getTargetResultsTrackOptions(), []);
  const [selectedTrack, setSelectedTrack] = useState(trackOptions[0]?.code ?? "GP");
  const { data, isLoading, isError, refetch, isFetching } = useTrackResultsFeed(selectedTrack, 30);

  return (
    <section className="mb-8">
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-3">
          <h2 className="text-lg font-semibold text-foreground font-heading shrink-0">Race results by track</h2>
          <select
            value={selectedTrack}
            onChange={(event) => setSelectedTrack(event.target.value)}
            className="h-9 min-w-[10rem] max-w-[min(100%,18rem)] rounded-md border border-input bg-background px-3 text-sm text-foreground"
            aria-label="Select racetrack for results"
          >
            {trackOptions.map((track) => (
              <option key={track.code} value={track.code}>
                {track.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="h-9 shrink-0"
            aria-label="Refresh race results"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Ingested from broad source feed, normalized, and republished per track.
        </p>
      </div>

      <div className="card-dark">
        {isLoading ? (
          <div className="py-10 flex justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : isError ? (
          <div className="py-6 text-sm text-muted-foreground text-center">
            Couldn&apos;t load results for this track right now.
          </div>
        ) : !data?.items?.length ? (
          <div className="py-6 text-sm text-muted-foreground text-center">
            No recent results available for this track yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.items.map((item) => (
              <li key={item.link} className="py-3 first:pt-0 last:pb-0">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 group"
                >
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                    {formatPubDate(item.pubDate)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
