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
import { StripeTestModeDevBanner } from "@/components/StripeTestModeDevBanner";
import { DashboardRecentDownloadsColumn } from "@/components/dashboard/DashboardRecentDownloadsColumn";
import { DashboardUpcomingRacecardsColumn } from "@/components/dashboard/DashboardUpcomingRacecardsColumn";
import { DashboardPurchasesAndCredits } from "@/components/dashboard/DashboardPurchasesAndCredits";
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
    const rows: { primary: (typeof unique)[0]; mergedCount: number }[] = [];
    for (const arr of groups.values()) {
      arr.sort((a, b) => a.id.localeCompare(b.id));
      rows.push({ primary: arr[0], mergedCount: arr.length });
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
        ? "First downloads this month"
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

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <StripeTestModeDevBanner />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground font-heading tracking-tight">
              Welcome back, <span className="text-neon">{displayName}</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Your credits, downloads, and upcoming racecards in one place.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="stat-card"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
                  ) : (
                    <stat.icon className={`h-5 w-5 ${stat.accent ? "text-primary" : "text-foreground/60"}`} />
                  )}
                </div>
                <div
                  className={`text-3xl font-bold font-mono-data ${stat.accent ? "text-primary" : "text-foreground"}`}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                {stat.trend && (
                  <div
                    className={`text-xs mt-2 ${
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
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4 font-heading">Quick actions</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {quickActions.map((action) => {
                const content = (
                  <div
                    className={`relative card-dark flex items-center gap-4 group ${
                      action.primary ? "border-primary/50" : ""
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        action.primary ? "bg-primary/20" : "bg-muted"
                      }`}
                    >
                      <action.icon
                        className={`h-6 w-6 ${action.primary ? "text-primary" : "text-foreground/60"}`}
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

          {/*
            Race results: reintroduce via Edge `otb-results-rss` (and optional `hrn-headlines-rss` fallback)
            when we have a reliable display model — see former `DashboardRacingResultsSection` in git history.
          */}
          <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-6 lg:gap-8 mb-8 max-w-5xl mx-auto w-full">
            <DashboardRecentDownloadsColumn loading={loading} recentDownloads={recentDownloads} />
            <DashboardUpcomingRacecardsColumn loading={loading} upcomingForDisplay={upcomingForDisplay} />
          </div>

          <DashboardPurchasesAndCredits
            loading={loading}
            recentPurchases={recentPurchases}
            showLowCredits={showLowCredits}
            credits={credits}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
