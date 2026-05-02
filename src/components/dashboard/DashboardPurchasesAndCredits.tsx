import { motion } from "framer-motion";
import { CreditCard, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { PurchaseRow } from "@/lib/queries/userDashboard";
import { formatLocalDate } from "@/lib/formatDashboardDate";

type Props = {
  loading: boolean;
  recentPurchases: PurchaseRow[];
  showLowCredits: boolean;
  credits: number | null;
};

export function DashboardPurchasesAndCredits({ loading, recentPurchases, showLowCredits, credits }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 font-heading">Recent purchases</h2>
        <div className="card-dark space-y-3">
          {loading && (
            <div className="py-6 flex justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!loading && recentPurchases.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              No completed purchases yet.{" "}
              <Link to="/buy-credits" className="text-primary hover:underline">
                Buy credits
              </Link>
              .
            </p>
          )}
          {!loading &&
            recentPurchases.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 text-sm border-b border-border/60 last:border-0 pb-3 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{p.package_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.unlimited_credits ? "Unlimited access · " : `${p.credits} credits · `}
                    {formatLocalDate(new Date(p.created_at), "MMM d, yyyy", "—")}
                  </div>
                </div>
                <span className="font-mono-data text-xs text-foreground shrink-0">${Number(p.amount).toFixed(2)}</span>
              </div>
            ))}
          {!loading && recentPurchases.length > 0 && (
            <Link to="/invoices" className="inline-block text-xs text-primary hover:underline pt-1">
              View all invoices →
            </Link>
          )}
        </div>
      </div>

      {showLowCredits && (
        <div className="rounded-xl p-4 border border-warning/30 bg-warning/5">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-foreground">Credits running low</div>
              <p className="text-xs text-muted-foreground mt-1">
                You have {credits} credit{credits === 1 ? "" : "s"} left. Add more before race day.
              </p>
              <Link to="/buy-credits">
                <Button size="sm" className="mt-3 bg-warning text-warning-foreground hover:brightness-110 text-xs">
                  Buy more credits
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
