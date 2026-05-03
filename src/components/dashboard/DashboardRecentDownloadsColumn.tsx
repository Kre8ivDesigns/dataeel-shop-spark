import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow, isValid } from "date-fns";
import { Download, Loader2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getInvokeErrorMessage } from "@/lib/edgeFunctionErrors";
import type { RecentDownloadRow } from "@/lib/queries/userDashboard";
import { formatLocalDate } from "@/lib/formatDashboardDate";
import { racecardDownloadKeys, userDashboardKeys } from "@/lib/queryKeys";

type Props = {
  loading: boolean;
  recentDownloads: RecentDownloadRow[];
};

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
      <div className="card-dark divide-y divide-border min-h-[200px] flex-1">
        {loading && (
          <div className="py-12 flex justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {!loading && recentDownloads.length === 0 && (
          <div className="py-10 px-4 text-center text-sm text-muted-foreground">
            No downloads yet.{" "}
            <Link to="/racecards" className="text-primary font-medium hover:underline">
              Browse available racecards
            </Link>
            .
          </div>
        )}
        {!loading &&
          recentDownloads.map((dl) => {
            const rc = dl.racecards;
            const label = rc?.track_name ?? "Racecard";
            const raceDt = rc?.race_date ? new Date(`${rc.race_date}T12:00:00`) : null;
            const sub = rc
              ? raceDt && isValid(raceDt)
                ? `${formatLocalDate(raceDt, "MMM d, yyyy", rc.race_date ?? "—")}${
                    rc.num_races != null ? ` · ${rc.num_races} races` : ""
                  }`
                : "Details unavailable"
              : "Details unavailable";
            return (
              <div key={dl.id} className="flex items-center justify-between py-4 first:pt-4 last:pb-4 px-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-foreground/50" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground text-sm truncate">{label}</div>
                    <div className="text-xs text-muted-foreground truncate">{sub}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {(() => {
                      const at = new Date(dl.created_at);
                      return isValid(at) ? formatDistanceToNow(at, { addSuffix: true }) : "—";
                    })()}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-foreground/60 hover:text-foreground"
                    aria-label={`Re-download PDF for ${label}`}
                    disabled={downloadingRacecardId === dl.racecard_id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleRedownload(dl.racecard_id, label);
                    }}
                  >
                    {downloadingRacecardId === dl.racecard_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Download className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
      </div>
    </motion.div>
  );
}
