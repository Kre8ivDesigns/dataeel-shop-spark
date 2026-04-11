import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, UserPlus, Download, Activity } from "lucide-react";
import {
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

function describeAuditLogFetchError(err: { code?: string; message?: string }): string {
  const code = err.code ?? "";
  const msg = err.message ?? "";
  if (code === "PGRST205" || /Could not find the table.*audit_log/i.test(msg)) {
    return "The audit_log table is not on this Supabase database (PostgREST PGRST205). Link the CLI to this project and run supabase db push, or execute supabase/migrations/20260310000000_security_hardening.sql in the SQL editor.";
  }
  return msg || "Could not load the audit log.";
}

const AdminAnalytics = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<string>("90");
  const [profiles, setProfiles] = useState<{ created_at: string }[]>([]);
  const [downloads, setDownloads] = useState<{ created_at: string }[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);

  const days = parseInt(range, 10);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 400);

    const [profRes, dlRes, auditRes] = await Promise.all([
      supabase.from("profiles").select("created_at").gte("created_at", since.toISOString()),
      supabase.from("racecard_downloads").select("created_at").gte("created_at", since.toISOString()),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(80),
    ]);

    setProfiles(profRes.data ?? []);
    setDownloads(dlRes.data ?? []);
    if (auditRes.error) {
      setAudit([]);
      setAuditError(describeAuditLogFetchError(auditRes.error));
    } else {
      setAuditError(null);
      setAudit((auditRes.data as AuditRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin, fetchAll]);

  const profFiltered = useMemo(() => filterSince(profiles, days), [profiles, days]);
  const dlFiltered = useMemo(() => filterSince(downloads, days), [downloads, days]);

  const signupsByDay = useMemo(() => countByDay(profFiltered), [profFiltered]);
  const downloadsByDay = useMemo(() => countByDay(dlFiltered), [dlFiltered]);

  const combinedChart = useMemo(() => {
    const keys = new Set<string>();
    signupsByDay.forEach((d) => keys.add(d.date));
    downloadsByDay.forEach((d) => keys.add(d.date));
    const sorted = Array.from(keys).sort();
    const smap = new Map(signupsByDay.map((d) => [d.date, d.count]));
    const dmap = new Map(downloadsByDay.map((d) => [d.date, d.count]));
    return sorted.map((date) => ({
      date,
      signups: smap.get(date) ?? 0,
      downloads: dmap.get(date) ?? 0,
    }));
  }, [signupsByDay, downloadsByDay]);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-foreground/50 hover:text-foreground mb-6 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground font-heading">Site analytics</h1>
              <p className="text-muted-foreground text-sm mt-1">
                First-party metrics from your database. Pair with Plausible or GA from Settings.
              </p>
            </div>
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

          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" /> New signups
                    </CardDescription>
                    <CardTitle className="text-2xl font-mono-data text-foreground">
                      {profFiltered.length}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">In selected range</CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Download className="h-4 w-4" /> Racecard downloads
                    </CardDescription>
                    <CardTitle className="text-2xl font-mono-data text-primary">
                      {dlFiltered.length}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">In selected range</CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Audit events (recent)
                    </CardDescription>
                    <CardTitle className="text-2xl font-mono-data text-foreground">{audit.length}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">Latest 80 rows</CardContent>
                </Card>
              </div>

              <Card className="bg-card border-border mb-8">
                <CardHeader>
                  <CardTitle className="text-foreground text-lg">Signups & downloads</CardTitle>
                  <CardDescription>Daily counts in the selected range</CardDescription>
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="signups" name="Signups" stroke="hsl(var(--info))" dot={false} strokeWidth={2} />
                        <Line
                          type="monotone"
                          dataKey="downloads"
                          name="Downloads"
                          stroke="hsl(var(--primary))"
                          dot={false}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

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
                          <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                            {new Date(a.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-foreground">{a.action}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {a.resource}
                            {a.resource_id ? ` · ${a.resource_id}` : ""}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-md truncate font-mono">
                            {a.detail ? JSON.stringify(a.detail) : "—"}
                          </TableCell>
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
