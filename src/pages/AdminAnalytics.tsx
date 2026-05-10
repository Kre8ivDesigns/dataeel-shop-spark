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
import {
  Activity,
  AlertTriangle,
  Brain,
  Download,
  Globe2,
  Loader2,
  MousePointerClick,
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
  type SiteAnalyticsEventRow,
  type TransactionAnalyticsRow,
} from "@/lib/siteAnalytics";

const RANGE_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
] as const;

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

const AdminAnalytics = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<string>("90");
  const [profiles, setProfiles] = useState<{ created_at: string }[]>([]);
  const [downloads, setDownloads] = useState<{ created_at: string }[]>([]);
  const [transactions, setTransactions] = useState<TransactionAnalyticsRow[]>([]);
  const [siteEvents, setSiteEvents] = useState<SiteAnalyticsEventRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [errors, setErrors] = useState<AuditRow[]>([]);

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

  const profFiltered = useMemo(() => filterSince(profiles, days), [profiles, days]);
  const dlFiltered = useMemo(() => filterSince(downloads, days), [downloads, days]);
  const analytics = useMemo(
    () => summarizeSiteAnalytics(siteEvents, transactions, days),
    [siteEvents, transactions, days],
  );

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

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-16">
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
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[200px] bg-card border-border lg:mt-6">
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
          }
          asideGridClassName="lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start gap-6"
          containerClassName="max-w-[1400px]"
          sectionClassName="pb-8"
        />
        <div className="container mx-auto px-4 max-w-[1400px]" style="padding-top: 25px;">
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
                <MetricCard icon={Download} label="Racecard downloads" value={dlFiltered.length} detail="In selected range" tone="primary" />
                <MetricCard icon={AlertTriangle} label="Errors" value={errors.length} detail="From latest 80 audit rows" tone={errors.length > 0 ? "danger" : "default"} />
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

              <Card className="bg-card border-border">
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
      <Footer />
    </div>
  );
};

export default AdminAnalytics;
