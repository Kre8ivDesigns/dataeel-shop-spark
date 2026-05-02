import { motion } from "framer-motion";
import { isValid } from "date-fns";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { extractCanonicalTrackCode, getRacetrackLabel } from "@/lib/racetracks";
import type { UpcomingCard } from "@/lib/queries/userDashboard";
import { formatLocalDate } from "@/lib/formatDashboardDate";

export type UpcomingDisplayRow = {
  primary: UpcomingCard;
  mergedCount: number;
};

type Props = {
  loading: boolean;
  upcomingForDisplay: UpcomingDisplayRow[];
};

export function DashboardUpcomingRacecardsColumn({ loading, upcomingForDisplay }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="flex flex-col min-h-0"
    >
      <h2 className="text-lg font-semibold text-foreground mb-4 font-heading">Upcoming racecards</h2>
      <div className="space-y-3 flex-1">
        {loading && (
          <div className="card-dark py-8 flex justify-center text-muted-foreground min-h-[200px]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {!loading && upcomingForDisplay.length === 0 && (
          <div className="card-dark py-6 px-4 text-sm text-muted-foreground text-center min-h-[120px] flex items-center justify-center">
            No published cards in the next few days. Check back soon.
          </div>
        )}
        {!loading &&
          upcomingForDisplay.map(({ primary: race, mergedCount }) => {
            const codeRaw = race.track_code ?? race.track_name;
            const title = getRacetrackLabel(codeRaw);
            const codeBadge = extractCanonicalTrackCode(codeRaw);
            const rd = new Date(`${race.race_date}T12:00:00`);
            const datePart = isValid(rd)
              ? `${formatLocalDate(rd, "EEE, MMM d", race.race_date)}${
                  race.num_races != null ? ` · ${race.num_races} races` : ""
                }`
              : (race.race_date ?? "—");
            const mergedNote = mergedCount > 1 ? ` · ${mergedCount} racecards` : "";
            return (
              <div
                key={`${codeBadge}|${race.race_date}|${race.id}`}
                className="card-dark flex items-center justify-between gap-2 sm:gap-3"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <span className="font-mono-data font-bold text-foreground text-[11px] sm:text-sm">
                      {codeBadge || "—"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground text-sm truncate">{title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {datePart}
                      {mergedNote}
                    </div>
                  </div>
                </div>
                <Link to="/racecards" className="shrink-0">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:brightness-110 text-xs">
                    Open
                  </Button>
                </Link>
              </div>
            );
          })}
      </div>
    </motion.div>
  );
}
