import { motion } from "framer-motion";
import { formatDistanceToNow, isValid } from "date-fns";
import { Download, Loader2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { RecentDownloadRow } from "@/lib/queries/userDashboard";
import { formatLocalDate } from "@/lib/formatDashboardDate";

type Props = {
  loading: boolean;
  recentDownloads: RecentDownloadRow[];
};

export function DashboardRecentDownloadsColumn({ loading, recentDownloads }: Props) {
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
                  <Link to="/racecards">
                    <Button variant="ghost" size="sm" className="text-xs text-foreground/60 hover:text-foreground">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
      </div>
    </motion.div>
  );
}
