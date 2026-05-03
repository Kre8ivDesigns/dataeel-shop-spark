import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  CreditCard,
  Download,
  MapPin,
  ShoppingCart,
  Settings,
  ChevronRight,
  Loader2,
  FileText,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeError } from "@/lib/errorHandler";
import { useAuth } from "@/contexts/AuthContext";
import { useUserDashboard } from "@/lib/queries/userDashboard";
import { invoiceListKeys, userDashboardKeys } from "@/lib/queryKeys";
import {
  invokeReconcileCheckoutSession,
  purchaseTransactionExists,
  waitForPurchaseTransaction,
  type ReconcileCheckoutInvokeResult,
} from "@/lib/postPaymentConfirmation";
import { schedulePostPaymentCreditRefetch } from "@/lib/schedulePostPaymentCreditRefetch";
import { PageHero } from "@/components/PageHero";
import { StripeTestModeDevBanner } from "@/components/StripeTestModeDevBanner";
import { DashboardRecentDownloadsColumn } from "@/components/dashboard/DashboardRecentDownloadsColumn";
import { DashboardUpcomingRacecardsColumn } from "@/components/dashboard/DashboardUpcomingRacecardsColumn";
import { DashboardPurchasesAndCredits } from "@/components/dashboard/DashboardPurchasesAndCredits";
import { DashboardRacingResultsSection } from "@/components/dashboard/DashboardRacingResultsSection";
import { extractCanonicalTrackCode, getRacetrackLabel } from "@/lib/racetracks";

const LOW_CREDITS_THRESHOLD = 3;

const Dashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentHandled = useRef(false);

  const [portalLoading, setPortalLoading] = useState(false);

  const { data, isLoading: loading, isError, error } = useUserDashboard(user?.id);

  useEffect(() => {
    if (!isError || !error) return;
    console.error("[dashboard]", error);
    const detail = error instanceof Error ? error.message : String(error);
    toast({
      title: "Could not load dashboard",
      description: detail || "Some sections may be incomplete. Try refreshing.",
      variant: "destructive",
    });
  }, [isError, error, toast]);

  const credits = data?.credits ?? null;
  const unlimitedCredits = data?.unlimitedCredits ?? false;
  const downloadsThisMonth = data?.downloadsThisMonth ?? 0;
  const downloadsLastMonth = data?.downloadsLastMonth ?? 0;
  const totalDownloads = data?.totalDownloads ?? 0;
  const tracksScheduledToday = data?.tracksScheduledToday ?? null;
  const recentDownloads = data?.recentDownloads ?? [];
  const upcomingCards = data?.upcomingCards ?? [];
  const ownedUpcomingRacecardIds = data?.ownedUpcomingRacecardIds ?? [];
  const recentPurchases = data?.recentPurchases ?? [];

  /** Dedupe: unique id, then one row per `(canonical_track_code, race_date)`; merged duplicates note count in subtitle. */
  const upcomingForDisplay = useMemo(() => {
    const seenId = new Set<string>();
    const unique = upcomingCards.filter((c) => {
      if (seenId.has(c.id)) return false;
      seenId.add(c.id);
      return true;
    });
    const groups = new Map<string, typeof unique>();
    for (const c of unique) {
      const canon = extractCanonicalTrackCode(c.track_code ?? c.track_name);
      const key = canon ? `${canon}|${c.race_date}` : `${c.id}|${c.race_date}`;
      const g = groups.get(key) ?? [];
      g.push(c);
      groups.set(key, g);
    }
    const rows: { primary: (typeof unique)[0]; mergedCount: number; racecardIds: string[] }[] = [];
    for (const arr of groups.values()) {
      arr.sort((a, b) => a.id.localeCompare(b.id));
      rows.push({
        primary: arr[0],
        mergedCount: arr.length,
        racecardIds: arr.map((c) => c.id),
      });
    }
    rows.sort((a, b) => {
      const d = a.primary.race_date.localeCompare(b.primary.race_date);
      if (d !== 0) return d;
      return getRacetrackLabel(a.primary.track_code ?? a.primary.track_name).localeCompare(
        getRacetrackLabel(b.primary.track_code ?? b.primary.track_name),
      );
    });
    return rows;
  }, [upcomingCards]);

  const displayName = useMemo(() => {
    if (!user) return "there";
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const fromMeta =
      typeof meta?.full_name === "string"
        ? meta.full_name
        : typeof meta?.name === "string"
          ? meta.name
          : null;
    if (fromMeta?.trim()) return fromMeta.trim();
    const email = user.email?.split("@")[0];
    return email || "there";
  }, [user]);

  useEffect(() => {
    if (paymentHandled.current) return;
    if (searchParams.get("payment") !== "success") return;
    if (!user?.id) return;
    const userId = user.id;
    paymentHandled.current = true;

    const added = searchParams.get("credits");
    const sessionId = searchParams.get("session_id");
    const expectedCredits = added ? parseInt(added, 10) : NaN;
    const unlimitedPurchase = searchParams.get("unlimited") === "1";

    const next = new URLSearchParams(searchParams);
    next.delete("payment");
    next.delete("credits");
    next.delete("session_id");
    next.delete("unlimited");
    setSearchParams(next, { replace: true });

    // Webhook may lag redirect; staggered invalidates avoid caching stale balance (see schedulePostPaymentCreditRefetch).
    schedulePostPaymentCreditRefetch(queryClient, userId);

    const abort = new AbortController();

    void (async () => {
      const pending = toast({
        title: "Confirming your payment",
        description: sessionId
          ? "Waiting for your purchase to sync… This usually takes a few seconds."
          : "Refreshing your account. If credits stay at zero, wait a moment and refresh the page.",
      });

      const refetchCommerceQueries = async () => {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: userDashboardKeys.detail(userId) }),
          queryClient.refetchQueries({ queryKey: ["credit-balance", userId] }),
          queryClient.refetchQueries({ queryKey: invoiceListKeys.list(userId) }),
        ]);
      };

      try {
        if (sessionId) {
          let ok = await waitForPurchaseTransaction({
            userId,
            sessionId,
            signal: abort.signal,
          });
          await refetchCommerceQueries();

          let reconcileAttempted = false;
          let reconcileResult: ReconcileCheckoutInvokeResult | undefined;
          if (!ok) {
            reconcileAttempted = true;
            reconcileResult = await invokeReconcileCheckoutSession(sessionId);
            await refetchCommerceQueries();
            const reconcileOk =
              reconcileResult.ok &&
              (Boolean(reconcileResult.fulfilled) || Boolean(reconcileResult.alreadyFulfilled));
            ok = reconcileOk || (await purchaseTransactionExists(userId, sessionId));
          }

          if (ok) {
            pending.update({
              id: pending.id,
              title: "Payment confirmed",
              description: unlimitedPurchase
                ? "Unlimited RaceCard access is now on your account. Receipts appear under Invoices (Account menu)."
                : Number.isFinite(expectedCredits) && expectedCredits > 0
                  ? `${expectedCredits} credits have been added to your account. Receipts appear under Invoices (Account menu).`
                  : "Your credits have been updated. Receipts appear under Invoices (Account menu).",
            });
          } else {
            const unpaidProcessing =
              reconcileResult?.ok === false && reconcileResult.code === "skipped_unpaid";
            pending.update({
              id: pending.id,
              variant: "destructive",
              title: unpaidProcessing ? "Payment still clearing" : "Credits not visible yet",
              description: unpaidProcessing
                ? "Stripe still shows this checkout as unpaid (typical for bank debits and some async methods). Credits apply automatically when the charge settles — try again later or contact support with your session id if it persists."
                : reconcileAttempted
                  ? "We synced with Stripe directly, but your purchase still is not on file. Try refreshing the page. If it persists, contact support with your Stripe receipt or session id."
                  : "Stripe redirected successfully, but your purchase has not appeared in our system yet. Try refreshing — webhook delays can exceed a minute. If nothing changes, contact support with your Stripe receipt.",
            });
          }
        } else {
          await refetchCommerceQueries();
          pending.update({
            id: pending.id,
            title: "Checking your account",
            description:
              "This checkout link did not include a session id, so we could not verify automatically. Refresh if credits or invoices still look empty.",
          });
        }
      } catch {
        /* aborted */
      }
    })();

    return () => abort.abort();
  }, [searchParams, setSearchParams, toast, queryClient, user?.id]);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    const { data, error } = await supabase.functions.invoke("customer-portal");
    setPortalLoading(false);
    if (error || data?.error) {
      toast({
        title: "Unable to open billing portal",
        description: data?.error || sanitizeError(error),
        variant: "destructive",
      });
    } else if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const monthTrend =
    downloadsLastMonth > 0
      ? `${downloadsThisMonth >= downloadsLastMonth ? "+" : ""}${downloadsThisMonth - downloadsLastMonth} vs last month`
      : downloadsThisMonth > 0
        ? null
        : "No downloads yet this month";

  const stats = [
    {
      label: "Credits remaining",
      value: loading ? "—" : unlimitedCredits ? "Unlimited" : String(credits ?? 0),
      icon: CreditCard,
      trend: null as string | null,
      trendUp: null as boolean | null,
      accent: true,
    },
    {
      label: "Downloads this month",
      value: loading ? "—" : String(downloadsThisMonth),
      icon: Download,
      trend: loading ? null : monthTrend,
      trendUp: downloadsThisMonth >= downloadsLastMonth,
      accent: false,
    },
    {
      label: "Total downloads",
      value: loading ? "—" : String(totalDownloads),
      icon: Download,
      trend: "All time",
      trendUp: null,
      accent: false,
    },
    {
      label: "Tracks scheduled today",
      value: loading ? "—" : String(tracksScheduledToday ?? 0),
      icon: Calendar,
      trend: "Published racecards",
      trendUp: null,
      accent: false,
    },
  ];

  const quickActions = [
    { label: "Browse RaceCards", icon: MapPin, href: "/racecards", primary: true },
    { label: "Buy credits", icon: ShoppingCart, href: "/buy-credits" },
    { label: "Invoices", icon: FileText, href: "/invoices" },
    { label: "Account settings", icon: Settings, href: "/account-settings" },
    { label: "Billing portal", icon: CreditCard, onClick: openCustomerPortal, href: "#" },
  ];

  const showLowCredits =
    !unlimitedCredits && credits !== null && credits <= LOW_CREDITS_THRESHOLD;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-16">
        <PageHero
          backTo="/"
          backLabel="Back to Home"
          badge="Dashboard"
          title={
            <>
              Welcome back, <span className="text-neon">{displayName}</span>
            </>
          }
          subtitle="Your credits, downloads, and upcoming racecards in one place."
          align="left"
          sectionClassName="pb-8"
        />
        <div className="container mx-auto px-4">
          <StripeTestModeDevBanner />
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-10 items-start">
            {/* Left: Recent downloads first (top of page body) */}
            <div className="min-w-0 space-y-8">
              <DashboardRecentDownloadsColumn loading={loading} recentDownloads={recentDownloads} />
            </div>

            {/* Right: stats, actions, results, upcoming, purchases */}
            <div className="min-w-0 space-y-8">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="stat-card"
                  >
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-2">
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-foreground/40" />
                      ) : (
                        <stat.icon className={`h-4 w-4 ${stat.accent ? "text-primary" : "text-foreground/60"}`} />
                      )}
                    </div>
                    <div
                      className={`text-2xl sm:text-3xl font-bold font-mono-data leading-tight ${stat.accent ? "text-primary" : "text-foreground"}`}
                    >
                      {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1 leading-snug">{stat.label}</div>
                    {stat.trend && (
                      <div
                        className={`text-[11px] sm:text-xs mt-1.5 ${
                          stat.trendUp === true
                            ? "text-success"
                            : stat.trendUp === false
                              ? "text-muted-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {stat.trendUp === true && "↑ "}
                        {stat.trendUp === false && downloadsThisMonth < downloadsLastMonth && "↓ "}
                        {stat.trend}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-lg font-semibold text-foreground mb-4 font-heading">Quick actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {quickActions.map((action) => {
                    const content = (
                      <div
                        className={`relative card-dark flex items-center gap-3 group ${
                          action.primary ? "border-primary/50" : ""
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            action.primary ? "bg-primary/20" : "bg-muted"
                          }`}
                        >
                          <action.icon
                            className={`h-5 w-5 ${action.primary ? "text-primary" : "text-foreground/60"}`}
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm">{action.label}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-foreground/30 ml-auto group-hover:text-foreground/60 transition-colors" />
                      </div>
                    );

                    if (action.onClick) {
                      return (
                        <button
                          key={action.label}
                          type="button"
                          onClick={action.onClick}
                          disabled={portalLoading}
                          className="text-left w-full disabled:opacity-60"
                        >
                          {content}
                        </button>
                      );
                    }

                    return (
                      <Link key={action.label} to={action.href}>
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>

              <DashboardRacingResultsSection />
              <DashboardUpcomingRacecardsColumn
                loading={loading}
                upcomingForDisplay={upcomingForDisplay}
                ownedUpcomingRacecardIds={ownedUpcomingRacecardIds}
                credits={credits}
                unlimitedCredits={unlimitedCredits}
              />
              <DashboardPurchasesAndCredits
                loading={loading}
                recentPurchases={recentPurchases}
                showLowCredits={showLowCredits}
                credits={credits}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
