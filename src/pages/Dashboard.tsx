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
import { format, formatDistanceToNow } from "date-fns";
import { useUserDashboard } from "@/lib/queries/userDashboard";
import { userDashboardKeys } from "@/lib/queryKeys";

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
  const downloadsThisMonth = data?.downloadsThisMonth ?? 0;
  const downloadsLastMonth = data?.downloadsLastMonth ?? 0;
  const totalDownloads = data?.totalDownloads ?? 0;
  const tracksScheduledToday = data?.tracksScheduledToday ?? null;
  const recentDownloads = data?.recentDownloads ?? [];
  const upcomingCards = data?.upcomingCards ?? [];
  const recentPurchases = data?.recentPurchases ?? [];

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
    paymentHandled.current = true;
    const added = searchParams.get("credits");
    toast({
      title: "Payment successful",
      description: added
        ? `${added} credits have been added to your account.`
        : "Your credits have been updated.",
    });
    const next = new URLSearchParams(searchParams);
    next.delete("payment");
    next.delete("credits");
    setSearchParams(next, { replace: true });
    void queryClient.invalidateQueries({ queryKey: userDashboardKeys.detail(user.id) });
    void queryClient.invalidateQueries({ queryKey: ["credit-balance", user.id] });
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
      value: loading ? "—" : String(credits ?? 0),
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

  const showLowCredits = credits !== null && credits <= LOW_CREDITS_THRESHOLD;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
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

          <div className="grid lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground font-heading">Recent downloads</h2>
                <Link to="/racecards">
                  <Button variant="ghost" size="sm" className="text-primary text-xs hover:text-primary/80">
                    Browse racecards →
                  </Button>
                </Link>
              </div>
              <div className="card-dark divide-y divide-border min-h-[200px]">
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
                    const sub = rc
                      ? `${format(new Date(rc.race_date + "T12:00:00"), "MMM d, yyyy")}${
                          rc.num_races != null ? ` · ${rc.num_races} races` : ""
                        }`
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
                            {formatDistanceToNow(new Date(dl.created_at), { addSuffix: true })}
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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4 font-heading">Upcoming racecards</h2>
                <div className="space-y-3">
                  {loading && (
                    <div className="card-dark py-8 flex justify-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  )}
                  {!loading && upcomingCards.length === 0 && (
                    <div className="card-dark py-6 px-4 text-sm text-muted-foreground text-center">
                      No published cards in the next few days. Check back soon.
                    </div>
                  )}
                  {!loading &&
                    upcomingCards.map((race) => (
                      <div key={race.id} className="card-dark flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">{race.track_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(race.race_date + "T12:00:00"), "EEE, MMM d")}
                            {race.num_races != null ? ` · ${race.num_races} races` : ""}
                          </div>
                        </div>
                        <Link to="/racecards">
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground hover:brightness-110 text-xs shrink-0"
                          >
                            Open
                          </Button>
                        </Link>
                      </div>
                    ))}
                </div>
              </div>

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
                      <div key={p.id} className="flex items-center justify-between gap-2 text-sm border-b border-border/60 last:border-0 pb-3 last:pb-0">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{p.package_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.credits} credits · {format(new Date(p.created_at), "MMM d, yyyy")}
                          </div>
                        </div>
                        <span className="font-mono-data text-xs text-foreground shrink-0">
                          ${Number(p.amount).toFixed(2)}
                        </span>
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
                        <Button
                          size="sm"
                          className="mt-3 bg-warning text-warning-foreground hover:brightness-110 text-xs"
                        >
                          Buy more credits
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
