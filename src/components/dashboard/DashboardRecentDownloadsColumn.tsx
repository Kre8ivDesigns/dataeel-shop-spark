import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, isValid } from "date-fns";
import { Download, FileText, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getInvokeErrorMessage } from "@/lib/edgeFunctionErrors";
import type { RecentDownloadRow } from "@/lib/queries/userDashboard";
import { formatLocalDate } from "@/lib/formatDashboardDate";
import { extractCanonicalTrackCode, getRacetrackLabel } from "@/lib/racetracks";
import { racecardDownloadKeys, userDashboardKeys } from "@/lib/queryKeys";
import {
  DEFAULT_RACECARD_DOWNLOAD_TZ,
  getRacecardDownloadUiBlock,
} from "@/lib/racecardDownloadDeadline";

const RACECARD_DOWNLOAD_TZ =
  import.meta.env.VITE_RACECARD_DOWNLOAD_TZ ?? DEFAULT_RACECARD_DOWNLOAD_TZ;

type Props = {
  loading: boolean;
  recentDownloads: RecentDownloadRow[];
};

function fileTypeLabel(fileName: string | null | undefined): string {
  if (!fileName?.trim()) return "PDF";
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "PDF";
  const m = fileName.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toUpperCase() : "PDF";
}

function RecentDownloadsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card-dark flex items-center justify-between gap-3 p-3 rounded-xl animate-pulse">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg bg-muted" />
            <div className="space-y-2 min-w-0 flex-1">
              <div className="h-4 bg-muted rounded w-3/5" />
              <div className="h-3 bg-muted/70 rounded w-4/5" />
            </div>
          </div>
          <div className="h-8 w-28 rounded-md bg-muted shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function DashboardRecentDownloadsColumn({ loading, recentDownloads }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [downloadingRacecardId, setDownloadingRacecardId] = useState<string | null>(null);

  const handleRedownload = useCallback(
    async (racecardId: string, trackLabel: string) => {
      if (!user) {
        toast({
          title: "Please sign in",
          description: "You need to be logged in to download racecards.",
          variant: "destructive",
        });
        return;
      }

      setDownloadingRacecardId(racecardId);
      try {
        const { data, error, response: invokeResponse } = await supabase.functions.invoke("download-racecard", {
          body: { racecardId },
        });

        if (error || !data?.signedUrl) {
          const msg = await getInvokeErrorMessage("download-racecard", error, data, invokeResponse);
          toast({ title: "Download failed", description: msg || "Download failed", variant: "destructive" });
          return;
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["credit-balance", user.id] }),
          queryClient.invalidateQueries({ queryKey: racecardDownloadKeys.byUser(user.id) }),
          queryClient.invalidateQueries({ queryKey: userDashboardKeys.detail(user.id) }),
        ]);

        window.open(data.signedUrl, "_blank");
        toast({
          title: data.alreadyOwned ? "Re-downloading" : "Downloaded!",
          description: `${data.fileName ?? trackLabel}`,
        });
      } catch {
        toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
      } finally {
        setDownloadingRacecardId(null);
      }
    },
    [queryClient, toast, user],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex flex-col min-h-0"
    >
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-lg font-semibold text-foreground font-heading">Recent downloads</h2>
        <Link to="/racecards">
          <Button variant="ghost" size="sm" className="text-primary text-xs hover:text-primary/80 shrink-0">
            Browse racecards →
          </Button>
        </Link>
      </div>
      <div className="space-y-3 flex-1 min-h-[200px]">
        {loading && <RecentDownloadsSkeleton />}

        {!loading && recentDownloads.length === 0 && (
          <div className="card-dark py-10 px-4 text-center min-h-[200px] flex flex-col items-center justify-center gap-3">
            <FileText className="h-10 w-10 text-foreground/25" aria-hidden />
            <p className="text-sm text-muted-foreground max-w-sm">
              No downloads yet. When you download a racecard pack, it will show up here with meet details and a quick
              re-download button.
            </p>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:brightness-110">
              <Link to="/racecards">Browse racecards</Link>
            </Button>
          </div>
        )}

        {!loading &&
          recentDownloads.map((dl) => {
            const rc = dl.racecards;
            const codeRaw = rc?.track_code ?? rc?.track_name;
            const title = rc ? getRacetrackLabel(codeRaw ?? "") : "Racecard";
            const codeBadge = rc ? extractCanonicalTrackCode(codeRaw) : "—";
            const raceDt = rc?.race_date ? new Date(`${rc.race_date}T12:00:00`) : null;
            const meetLine =
              rc && raceDt && isValid(raceDt)
                ? formatLocalDate(raceDt, "EEE, MMM d, yyyy", rc.race_date)
                : rc?.race_date ?? "—";
            const racesPart = rc?.num_races != null ? ` · ${rc.num_races} races` : "";
            const typeLabel = fileTypeLabel(rc?.file_name);
            const at = new Date(dl.created_at);
            const relativeDl = isValid(at) ? formatDistanceToNow(at, { addSuffix: true }) : "—";
            const displayName = rc?.file_name?.trim() || "Racecard pack";
            const dlBlock = rc?.race_date
              ? getRacecardDownloadUiBlock(rc.race_date, RACECARD_DOWNLOAD_TZ, Date.now())
              : ({ blocked: false } as const);
            const downloadDisabled = dlBlock.blocked;
            const isBusy = downloadingRacecardId === dl.racecard_id;
            const blockReason =
              downloadDisabled && "reason" in dlBlock
                ? dlBlock.reason === "past_race_day"
                  ? "This race day has passed; the download window is closed."
                  : "Download window closed (end of race day)."
                : null;

            return (
              <div key={dl.id} className="card-dark rounded-xl p-3 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <span className="font-mono-data font-bold text-foreground text-[11px] sm:text-sm">
                        {codeBadge || "—"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground text-sm truncate">{title}</div>
                      <div className="text-xs text-muted-foreground">
                        {meetLine}
                        {racesPart} · {typeLabel} · {relativeDl}
                      </div>
                      <div
                        className="text-[11px] text-muted-foreground/90 truncate mt-0.5"
                        title={rc?.file_name ?? undefined}
                      >
                        {displayName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 sm:flex-initial bg-primary text-primary-foreground hover:brightness-110 text-xs min-h-9"
                      aria-label={`Download PDF for ${title}`}
                      disabled={isBusy || downloadDisabled || !rc}
                      title={
                        !rc
                          ? "Racecard is no longer available"
                          : downloadDisabled
                            ? "Downloads closed after the race day in the configured timezone."
                            : "Open PDF in a new tab"
                      }
                      onClick={() => void handleRedownload(dl.racecard_id, title)}
                    >
                      {isBusy ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      )}
                      {!rc ? "Unavailable" : downloadDisabled ? "Unavailable" : "Download PDF"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs border-border text-foreground/80" asChild>
                      <Link to="/racecards">Browse</Link>
                    </Button>
                  </div>
                </div>
                {blockReason && <p className="text-[11px] text-muted-foreground pl-0 sm:pl-[3.25rem]">{blockReason}</p>}
              </div>
            );
          })}
      </div>
    </motion.div>
  );
}
