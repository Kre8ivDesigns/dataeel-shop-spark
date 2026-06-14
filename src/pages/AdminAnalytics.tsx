import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  Brain,
  Download,
  Globe2,
  Loader2,
  Megaphone,
  MonitorSmartphone,
  MousePointerClick,
  Printer,
  Route,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { countByDay, filterSince } from "@/lib/adminCharts";
import {
  summarizeSiteAnalytics,
  type AnalyticsIssue,
  type DeviceSummary,
  type SiteAnalyticsEventRow,
  type SourceSummary,
  type TransactionAnalyticsRow,
} from "@/lib/siteAnalytics";

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
] as const;

type FbAdsRow = {
  date: string;
  account_currency: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  purchases: number;
  purchase_value: number;
};

type FbAdsResponse = {
  configured: boolean;
  rows?: FbAdsRow[];
  error?: string;
};

type AuditRow = {
  id: string;
  created_at: string;
  action: string;
  resource: string;
  resource_id: string | null;
  detail: Record<string, unknown> | null;
  actor_id: string | null;
};

const ERROR_ACTION_PATTERNS = ["error", "fail", "exception", "denied", "unauthorized"];
const ALL_ACTION_TYPES = "all";

function isErrorRow(row: AuditRow): boolean {
  const action = row.action.toLowerCase();
  const detail = JSON.stringify(row.detail ?? "").toLowerCase();
  return ERROR_ACTION_PATTERNS.some((p) => action.includes(p) || detail.includes(p));
}

function describeTableFetchError(tableName: string, err: { code?: string; message?: string }): string {
  const code = err.code ?? "";
  const msg = err.message ?? "";
  if (code === "PGRST205" || new RegExp(`Could not find the table.*${tableName}`, "i").test(msg)) {
    if (tableName === "audit_log") {
      return "The audit_log table is not on this Supabase database. Run supabase db push or execute supabase/migrations/20260310000000_security_hardening.sql.";
    }
    return "The site_analytics_events table is not on this Supabase database yet. Run supabase db push or execute supabase/migrations/20260509130000_site_analytics_events.sql.";
  }
  return msg || `Could not load ${tableName}.`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function formatMoney(value: number, currency: string | null): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${(currency || "USD")} ${value.toFixed(2)}`;
  }
}

function issueVariant(issue: AnalyticsIssue): "default" | "secondary" | "destructive" | "outline" {
  if (issue.severity === "high") return "destructive";
  if (issue.severity === "medium") return "secondary";
  return "outline";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  detail: string;
  tone?: "default" | "primary" | "danger";
}) {
  const valueClass =
    tone === "danger" ? "text-destructive" : tone === "primary" ? "text-primary" : "text-foreground";
  return (
    <Card className={`border-border ${tone === "danger" ? "bg-destructive/10 border-destructive/30" : "bg-card"}`}>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${tone === "danger" ? "text-destructive" : ""}`} /> {label}
        </CardDescription>
        <CardTitle className={`text-2xl font-mono-data ${valueClass}`}>{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{detail}</CardContent>
    </Card>
  );
}

function formatSourceLabel(source: SourceSummary): string {
  if (source.source === "direct") return "Direct";
  return source.source;
}

function formatDeviceLabel(deviceType: DeviceSummary["deviceType"]): string {
  if (deviceType === "desktop") return "Desktop";
  if (deviceType === "tablet") return "Tablet";
  return "Mobile";
}

function formatShortUrl(value: string | null): string {
  if (!value) return "-";
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}` || url.hostname;
  } catch {
    return value;
  }
}

const AdminAnalytics = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<string>("90");
  const [actionType, setActionType] = useState<string>(ALL_ACTION_TYPES);
  const [profiles, setProfiles] = useState<{ created_at: string }[]>([]);
  const [downloads, setDownloads] = useState<{ created_at: string }[]>([]);
  const [transactions, setTransactions] = useState<TransactionAnalyticsRow[]>([]);
  const [siteEvents, setSiteEvents] = useState<SiteAnalyticsEventRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [errors, setErrors] = useState<AuditRow[]>([]);
  const [fbAds, setFbAds] = useState<FbAdsRow[]>([]);
  const [fbConfigured, setFbConfigured] = useState<boolean | null>(null);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState<string | null>(null);

  const days = parseInt(range, 10);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 400);

    const [profRes, dlRes, txRes, siteRes, auditRes] = await Promise.all([
      supabase.from("profiles").select("created_at").gte("created_at", since.toISOString()),
      supabase.from("racecard_downloads").select("created_at").gte("created_at", since.toISOString()),
      supabase.from("transactions").select("created_at,status,user_id").gte("created_at", since.toISOString()),
      supabase
        .from("site_analytics_events")
        .select(
          "created_at,event_name,visitor_id,session_id,user_id,path,page_title,referrer,referrer_host,source,medium,campaign,content,term,device_type,is_new_visitor,first_seen_at,properties",
        )
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(80),
    ]);

    setProfiles(profRes.data ?? []);
    setDownloads(dlRes.data ?? []);
    setTransactions((txRes.data as TransactionAnalyticsRow[]) ?? []);
    if (siteRes.error) {
      setSiteEvents([]);
      setAnalyticsError(describeTableFetchError("site_analytics_events", siteRes.error));
    } else {
      setAnalyticsError(null);
      setSiteEvents(((siteRes.data as SiteAnalyticsEventRow[]) ?? []).filter((row) => row.visitor_id && row.session_id));
    }

    if (auditRes.error) {
      setAudit([]);
      setErrors([]);
      setAuditError(describeTableFetchError("audit_log", auditRes.error));
    } else {
      setAuditError(null);
      const rows = (auditRes.data as AuditRow[]) ?? [];
      setAudit(rows);
      setErrors(rows.filter(isErrorRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin, fetchAll]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setFbLoading(true);
    setFbError(null);
    supabase.functions
      .invoke<FbAdsResponse>("facebook-ads-insights", { body: { days } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setFbConfigured(null);
          setFbError(error.message);
          setFbAds([]);
          return;
        }
        setFbConfigured(data?.configured ?? false);
        setFbError(data?.error ?? null);
        setFbAds(data?.rows ?? []);
      })
      .finally(() => {
        if (!cancelled) setFbLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, days]);

  const profFiltered = useMemo(() => filterSince(profiles, days), [profiles, days]);
  const dlFiltered = useMemo(() => filterSince(downloads, days), [downloads, days]);
  const analytics = useMemo(
    () => summarizeSiteAnalytics(siteEvents, transactions, days),
    [siteEvents, transactions, days],
  );
  const signupEventCount = useMemo(
    () => filterSince(siteEvents.filter((row) => row.event_name === "signup_completed"), days).length,
    [siteEvents, days],
  );
  const actionTypeOptions = useMemo(
    () => Array.from(new Set(siteEvents.map((row) => row.event_name).filter(Boolean))).sort(),
    [siteEvents],
  );
  const filteredSiteEvents = useMemo(
    () =>
      filterSince(siteEvents, days)
        .filter((row) => actionType === ALL_ACTION_TYPES || row.event_name === actionType)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 80),
    [siteEvents, days, actionType],
  );

  const handlePrintReport = () => {
    window.print();
  };

  const combinedChart = useMemo(() => {
    const signupsByDay = countByDay(profFiltered);
    const downloadsByDay = countByDay(dlFiltered);
    const visitorsByDay = countByDay(
      siteEvents
        .filter((row) => row.event_name === "page_view")
        .filter((row) => filterSince([row], days).length > 0)
        .map((row) => ({ created_at: row.created_at })),
    );
    const keys = new Set<string>();
    signupsByDay.forEach((d) => keys.add(d.date));
    downloadsByDay.forEach((d) => keys.add(d.date));
    visitorsByDay.forEach((d) => keys.add(d.date));
    const smap = new Map(signupsByDay.map((d) => [d.date, d.count]));
    const dmap = new Map(downloadsByDay.map((d) => [d.date, d.count]));
    const vmap = new Map(visitorsByDay.map((d) => [d.date, d.count]));
    return Array.from(keys)
      .sort()
      .map((date) => ({
        date,
        signups: smap.get(date) ?? 0,
        downloads: dmap.get(date) ?? 0,
        pageViews: vmap.get(date) ?? 0,
      }));
  }, [profFiltered, dlFiltered, siteEvents, days]);

  const fbTotals = useMemo(() => {
    const currency = fbAds.find((row) => row.account_currency)?.account_currency ?? null;
    const spend = fbAds.reduce((sum, row) => sum + row.spend, 0);
    const impressions = fbAds.reduce((sum, row) => sum + row.impressions, 0);
    const clicks = fbAds.reduce((sum, row) => sum + row.clicks, 0);
    const purchases = fbAds.reduce((sum, row) => sum + row.purchases, 0);
    const purchaseValue = fbAds.reduce((sum, row) => sum + row.purchase_value, 0);
    const signups = analytics.signupFunnel.completions;
    return {
      currency,
      spend,
      impressions,
      clicks,
      purchases,
      purchaseValue,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      roas: spend > 0 ? purchaseValue / spend : 0,
      costPerSignup: signups > 0 ? spend / signups : 0,
    };
  }, [fbAds, analytics.signupFunnel.completions]);

  const fbChart = useMemo(
    () =>
      fbAds.map((row) => ({
        date: row.date,
        spend: Math.round(row.spend * 100) / 100,
        clicks: row.clicks,
        purchases: row.purchases,
      })),
    [fbAds],
  );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="analytics-print-hide">
        <Header />
      </div>
      <main className="pb-16 analytics-print-report">
        <PageHero
          backTo="/admin"
          backLabel="Back to Admin"
          badge="Admin"
          title={
            <>
              Site <span className="text-neon">analytics</span>
            </>
          }
          subtitle="First-party traffic, visitor, source, and purchase-funnel analytics."
          align="left"
          aside={
            <div className="analytics-print-hide flex flex-col gap-2 sm:flex-row lg:mt-6">
              <Button type="button" variant="outline" className="gap-2" onClick={handlePrintReport}>
                <Printer className="h-4 w-4" />
                Print report
              </Button>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="w-[200px] bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
          asideGridClassName="lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start gap-6"
          containerClassName="max-w-[1400px]"
          sectionClassName="pb-8"
        />
        <div className="container mx-auto max-w-[1400px] px-4 pt-6 md:pt-8">
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {analyticsError ? (
                <Alert variant="destructive" className="mb-6">
                  <AlertTitle>Site analytics unavailable</AlertTitle>
                  <AlertDescription>{analyticsError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <MetricCard icon={Users} label="Visitors" value={analytics.visitors} detail="Unique browsers in selected range" />
                <MetricCard icon={UserPlus} label="New visitors" value={analytics.newVisitors} detail={`${analytics.returningVisitors} returning visitors`} tone="primary" />
                <MetricCard icon={Activity} label="Bounce rate" value={formatPercent(analytics.bounceRate)} detail={`${analytics.avgPagesPerSession} pages per session`} tone={analytics.bounceRate >= 55 ? "danger" : "default"} />
                <MetricCard icon={Globe2} label="Top source" value={analytics.topSources[0]?.source ?? "None"} detail={analytics.topSources[0] ? `${analytics.topSources[0].medium} - ${analytics.topSources[0].visitors} visitors` : "No traffic source data"} />
                <MetricCard icon={MousePointerClick} label="Pricing to buy" value={formatPercent(analytics.pricingToBuyRate)} detail={`${analytics.pricingVisitors} pricing visitors`} />
                <MetricCard icon={Route} label="Checkout starts" value={analytics.checkoutStarts} detail={`${formatPercent(analytics.checkoutStartRate)} of Buy Credits visitors`} />
                <MetricCard icon={UserPlus} label="Signup events" value={signupEventCount} detail="Tracked frontend signup completions" tone="primary" />
                <MetricCard icon={Download} label="Racecard downloads" value={dlFiltered.length} detail="In selected range" tone="primary" />
                <MetricCard icon={Globe2} label="Attributed traffic" value={formatPercent(analytics.utmCoverage.percentAttributed)} detail={`${analytics.utmCoverage.directVisitors} direct visitors`} tone={analytics.utmCoverage.percentAttributed < 40 ? "danger" : "default"} />
                <MetricCard icon={Route} label="RaceCards intent" value={analytics.racecardsFunnel.racecardsVisitors} detail={`${analytics.racecardsFunnel.joinClicks} join clicks from RaceCards`} />
                <MetricCard icon={MousePointerClick} label="CTA clicks" value={analytics.topCtaClicks.reduce((sum, item) => sum + item.clicks, 0)} detail="Tracked buttons and links" />
                <MetricCard icon={AlertTriangle} label="Errors" value={errors.length} detail="From latest 80 audit rows" tone={errors.length > 0 ? "danger" : "default"} />
              </div>

              <Card className="bg-card border-border mb-8">
                <CardHeader>
                  <CardTitle className="text-foreground text-lg flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" /> Facebook Ads
                  </CardTitle>
                  <CardDescription>Spend, reach, and conversions from the Meta Marketing API for the selected range</CardDescription>
                </CardHeader>
                <CardContent>
                  {fbLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : fbError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Could not load Facebook Ads</AlertTitle>
                      <AlertDescription>{fbError}</AlertDescription>
                    </Alert>
                  ) : fbConfigured === false ? (
                    <Alert>
                      <AlertTitle>Facebook Ads not connected</AlertTitle>
                      <AlertDescription>
                        Add the <code>META_ACCESS_TOKEN</code> and <code>META_AD_ACCOUNT_ID</code> Edge Function secrets
                        (Supabase Dashboard → Project Settings → Edge Functions → Secrets), then reload this page.
                      </AlertDescription>
                    </Alert>
                  ) : fbAds.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No Facebook Ads activity in this range.</p>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <MetricCard icon={Megaphone} label="Ad spend" value={formatMoney(fbTotals.spend, fbTotals.currency)} detail={`${fbTotals.impressions.toLocaleString()} impressions`} tone="primary" />
                        <MetricCard icon={MousePointerClick} label="Link clicks" value={fbTotals.clicks.toLocaleString()} detail={`${formatPercent(fbTotals.ctr)} CTR · ${formatMoney(fbTotals.cpc, fbTotals.currency)} CPC`} />
                        <MetricCard icon={Route} label="Pixel purchases" value={fbTotals.purchases} detail={`${formatMoney(fbTotals.purchaseValue, fbTotals.currency)} value · ${fbTotals.roas.toFixed(2)}x ROAS`} />
                        <MetricCard icon={UserPlus} label="Cost / signup" value={analytics.signupFunnel.completions > 0 ? formatMoney(fbTotals.costPerSignup, fbTotals.currency) : "-"} detail={`${analytics.signupFunnel.completions} tracked signups (all sources)`} />
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={fbChart}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                            <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                            <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="spend" name={`Spend (${fbTotals.currency || "USD"})`} stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="clicks" name="Clicks" stroke="hsl(var(--info))" dot={false} strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="purchases" name="Purchases" stroke="hsl(var(--muted-foreground))" dot={false} strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cost per signup divides Facebook spend by all tracked signups; attribute more precisely by tagging ad URLs with
                        {" "}<code>utm_source=facebook&amp;utm_medium=paid</code> and cross-referencing the Visitor sources table.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid xl:grid-cols-2 gap-6 mb-8">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg flex items-center gap-2">
                      <Route className="h-5 w-5 text-primary" /> Landing pages
                    </CardTitle>
                    <CardDescription>First page in each session, with bounce and checkout signal</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Landing page</TableHead>
                          <TableHead>Visitors</TableHead>
                          <TableHead>Bounce</TableHead>
                          <TableHead>Checkouts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.topLandingPages.map((page) => (
                          <TableRow key={page.path}>
                            <TableCell className="font-mono text-xs text-foreground">{page.path}</TableCell>
                            <TableCell>{page.visitors}</TableCell>
                            <TableCell>{formatPercent(page.bounceRate)}</TableCell>
                            <TableCell>{page.checkoutStarts}</TableCell>
                          </TableRow>
                        ))}
                        {analytics.topLandingPages.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              No landing-page signal yet
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg flex items-center gap-2">
                      <MousePointerClick className="h-5 w-5 text-primary" /> CTA click map
                    </CardTitle>
                    <CardDescription>Which links and buttons visitors actually click</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>CTA</TableHead>
                          <TableHead>Path</TableHead>
                          <TableHead>Clicks</TableHead>
                          <TableHead>Visitors</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.topCtaClicks.map((cta) => (
                          <TableRow key={cta.key}>
                            <TableCell>
                              <div className="max-w-[260px]">
                                <p className="truncate text-sm font-medium text-foreground">{cta.label}</p>
                                <p className="truncate text-xs text-muted-foreground">{formatShortUrl(cta.href)}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{cta.path ?? "-"}</TableCell>
                            <TableCell>{cta.clicks}</TableCell>
                            <TableCell>{cta.visitors}</TableCell>
                          </TableRow>
                        ))}
                        {analytics.topCtaClicks.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              No CTA clicks tracked yet
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg">UTM coverage</CardTitle>
                    <CardDescription>How much traffic is attributable versus direct</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">Attributed visitors</span>
                        <span className="font-mono-data text-muted-foreground">
                          {analytics.utmCoverage.attributedVisitors} · {formatPercent(analytics.utmCoverage.percentAttributed)}
                        </span>
                      </div>
                      <Progress value={analytics.utmCoverage.percentAttributed} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-md bg-background/60 p-3">
                        <div className="font-mono-data text-lg text-foreground">{analytics.utmCoverage.directVisitors}</div>
                        <div className="text-xs text-muted-foreground">Direct visitors</div>
                      </div>
                      <div className="rounded-md bg-background/60 p-3">
                        <div className="font-mono-data text-lg text-foreground">{analytics.utmCoverage.campaignVisitors}</div>
                        <div className="text-xs text-muted-foreground">Campaign visitors</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg">RaceCards intent funnel</CardTitle>
                    <CardDescription>What visitors do on the RaceCards page before signup</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: "Viewed RaceCards", value: analytics.racecardsFunnel.racecardsVisitors },
                      { label: "Changed date", value: analytics.racecardsFunnel.dateChanges },
                      { label: "Searched tracks", value: analytics.racecardsFunnel.searches },
                      { label: "Opened card details", value: analytics.racecardsFunnel.cardExpansions },
                      { label: "Clicked join", value: analytics.racecardsFunnel.joinClicks },
                    ].map((step) => (
                      <div key={step.label} className="flex items-center justify-between rounded-md bg-background/60 px-3 py-2 text-sm">
                        <span className="text-foreground">{step.label}</span>
                        <span className="font-mono-data text-muted-foreground">{step.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg">Signup funnel</CardTitle>
                    <CardDescription>Auth-page starts, submits, failures, and completions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: "Signup starts", value: analytics.signupFunnel.starts },
                      { label: "Signup submits", value: analytics.signupFunnel.submits },
                      { label: "Signup failures", value: analytics.signupFunnel.failures },
                      { label: "Signup completions", value: analytics.signupFunnel.completions },
                    ].map((step) => (
                      <div key={step.label} className="flex items-center justify-between rounded-md bg-background/60 px-3 py-2 text-sm">
                        <span className="text-foreground">{step.label}</span>
                        <span className="font-mono-data text-muted-foreground">{step.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg flex items-center gap-2">
                      <MonitorSmartphone className="h-5 w-5 text-primary" /> Platform mix
                    </CardTitle>
                    <CardDescription>What device platform visitors are using</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analytics.deviceBreakdown.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No platform signal yet.</p>
                    ) : (
                      analytics.deviceBreakdown.map((device) => (
                        <div key={device.deviceType} className="space-y-2">
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="font-medium text-foreground">{formatDeviceLabel(device.deviceType)}</span>
                            <span className="font-mono-data text-muted-foreground">
                              {device.visitors} visitors · {formatPercent(device.percentOfVisitors)}
                            </span>
                          </div>
                          <Progress value={device.percentOfVisitors} className="h-2" />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg flex items-center gap-2">
                      <Globe2 className="h-5 w-5 text-primary" /> Where they came from
                    </CardTitle>
                    <CardDescription>Top acquisition sources from UTM and referrer data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analytics.topSources.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No source signal yet.</p>
                    ) : (
                      analytics.topSources.slice(0, 5).map((source) => (
                        <div key={source.key} className="flex items-center justify-between gap-4 rounded-md bg-background/60 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{formatSourceLabel(source)}</p>
                            <p className="text-xs text-muted-foreground">{source.medium} · {formatPercent(source.bounceRate)} bounce</p>
                          </div>
                          <div className="text-right font-mono-data text-sm text-muted-foreground">
                            <p className="text-foreground">{source.visitors}</p>
                            <p className="text-xs">visitors</p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)] gap-6 mb-8">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg">Traffic and conversions</CardTitle>
                    <CardDescription>Daily pageviews, signups, and RaceCard downloads</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    {combinedChart.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-16">No activity in this range</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={combinedChart}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                          <Legend />
                          <Line type="monotone" dataKey="pageViews" name="Pageviews" stroke="hsl(var(--muted-foreground))" dot={false} strokeWidth={2} />
                          <Line type="monotone" dataKey="signups" name="Signups" stroke="hsl(var(--info))" dot={false} strokeWidth={2} />
                          <Line type="monotone" dataKey="downloads" name="Downloads" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" /> AI analysis
                    </CardTitle>
                    <CardDescription>Conversion issues detected from first-party behavior</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analytics.issues.map((issue) => (
                      <div key={issue.title} className="rounded-lg border border-border bg-background/60 p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-sm font-semibold text-foreground">{issue.title}</h3>
                          <Badge variant={issueVariant(issue)}>{issue.severity}</Badge>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">{issue.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="grid xl:grid-cols-2 gap-6 mb-8">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg">Visitor sources</CardTitle>
                    <CardDescription>Where visitors are coming from, including UTM and referrer data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.topSources}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="source" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                          <Bar dataKey="visitors" name="Visitors" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Medium</TableHead>
                          <TableHead>Visitors</TableHead>
                          <TableHead>Bounce</TableHead>
                          <TableHead>Checkouts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.topSources.map((source) => (
                          <TableRow key={source.key}>
                            <TableCell className="font-medium text-foreground">{source.source}</TableCell>
                            <TableCell className="text-muted-foreground">{source.medium}</TableCell>
                            <TableCell>{source.visitors}</TableCell>
                            <TableCell>{formatPercent(source.bounceRate)}</TableCell>
                            <TableCell>{source.checkoutStarts}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg">Purchase funnel</CardTitle>
                    <CardDescription>Where buyers are slowing down before purchase</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {[
                      { label: "Pricing visitors", value: analytics.pricingVisitors, pct: 100 },
                      { label: "Reached Buy Credits", value: analytics.buyCreditsVisitors, pct: analytics.pricingToBuyRate },
                      { label: "Started checkout", value: analytics.checkoutStarts, pct: analytics.checkoutStartRate },
                      { label: "Completed purchases", value: analytics.completedPurchases, pct: analytics.checkoutCompletionRate },
                    ].map((step) => (
                      <div key={step.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{step.label}</span>
                          <span className="font-mono-data text-muted-foreground">{step.value}</span>
                        </div>
                        <Progress value={Math.min(step.pct, 100)} className="h-2" />
                      </div>
                    ))}
                    <div className="pt-2">
                      <h3 className="text-sm font-semibold text-foreground mb-3">Top exit pages</h3>
                      <div className="space-y-2">
                        {analytics.topExitPages.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No exit-page signal yet.</p>
                        ) : (
                          analytics.topExitPages.map((item) => (
                            <div key={item.path} className="flex items-center justify-between rounded-md bg-background/60 px-3 py-2 text-sm">
                              <span className="font-mono text-xs text-foreground">{item.path}</span>
                              <span className="text-muted-foreground">{item.exits} exits</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {errors.length > 0 && (
                <Card className="bg-destructive/10 border-destructive/30 mb-8">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" /> Error log
                    </CardTitle>
                    <CardDescription>Recent error events detected in audit log</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Resource</TableHead>
                          <TableHead>Detail</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errors.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{new Date(e.created_at).toLocaleString()}</TableCell>
                            <TableCell className="font-mono text-xs text-destructive">{e.action}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{e.resource}{e.resource_id ? ` - ${e.resource_id}` : ""}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-md truncate font-mono">{e.detail ? JSON.stringify(e.detail) : "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-card border-border mb-8 analytics-print-hide">
                <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-foreground">Site event log</CardTitle>
                    <CardDescription>Recent first-party analytics actions in the selected date range</CardDescription>
                  </div>
                  <Select value={actionType} onValueChange={setActionType}>
                    <SelectTrigger className="w-full bg-background border-border sm:w-[240px]">
                      <SelectValue placeholder="Action type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_ACTION_TYPES}>All action types</SelectItem>
                      {actionTypeOptions.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action type</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSiteEvents.map((event) => (
                        <TableRow key={`${event.session_id}-${event.event_name}-${event.created_at}`}>
                          <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{new Date(event.created_at).toLocaleString()}</TableCell>
                          <TableCell className="font-mono text-xs text-foreground">{event.event_name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{event.path ?? "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{event.source} / {event.medium}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-md truncate font-mono">{event.properties ? JSON.stringify(event.properties) : "-"}</TableCell>
                        </TableRow>
                      ))}
                      {filteredSiteEvents.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                            No site events match this action type
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="bg-card border-border analytics-print-hide">
                <CardHeader>
                  <CardTitle className="text-foreground">Audit log</CardTitle>
                  <CardDescription>Security and admin actions (newest first)</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto space-y-4">
                  {auditError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Audit log unavailable</AlertTitle>
                      <AlertDescription>{auditError}</AlertDescription>
                    </Alert>
                  ) : null}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {audit.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                          <TableCell className="font-mono text-xs text-foreground">{a.action}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{a.resource}{a.resource_id ? ` - ${a.resource_id}` : ""}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-md truncate font-mono">{a.detail ? JSON.stringify(a.detail) : "-"}</TableCell>
                        </TableRow>
                      ))}
                      {audit.length === 0 && !auditError && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                            No audit entries yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <div className="analytics-print-hide">
        <Footer />
      </div>
    </div>
  );
};

export default AdminAnalytics;
