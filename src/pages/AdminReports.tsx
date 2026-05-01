import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { sanitizeError } from "@/lib/errorHandler";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type LedgerRow = Tables<"credit_ledger">;

type DownloadJoin = {
  racecard_id: string;
  racecards: { track_name: string; track_code: string; race_date: string; file_name: string } | null;
};

const AdminReports = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [downloads, setDownloads] = useState<DownloadJoin[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; email: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [ledRes, dlRes, profRes] = await Promise.all([
      supabase.from("credit_ledger").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("racecard_downloads")
        .select("racecard_id, racecards(track_name, track_code, race_date, file_name)"),
      supabase.from("profiles").select("user_id, email"),
    ]);
    setLoading(false);
    if (ledRes.error) toast.error(sanitizeError(ledRes.error));
    if (dlRes.error) toast.error(sanitizeError(dlRes.error));
    setLedger(ledRes.data ?? []);
    setDownloads((dlRes.data as DownloadJoin[]) ?? []);
    setProfiles(profRes.data ?? []);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const emailByUser = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.user_id, p.email])),
    [profiles],
  );

  const byRacecard = useMemo(() => {
    const m = new Map<
      string,
      { count: number; track_name: string; race_date: string; file_name: string }
    >();
    for (const d of downloads) {
      const rc = d.racecards;
      const label = d.racecard_id;
      const cur = m.get(label) ?? {
        count: 0,
        track_name: rc?.track_name ?? "—",
        race_date: rc?.race_date ?? "—",
        file_name: rc?.file_name ?? "—",
      };
      cur.count += 1;
      m.set(label, cur);
    }
    return Array.from(m.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [downloads]);

  const byTrack = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of downloads) {
      const t = d.racecards?.track_name ?? "Unknown";
      m.set(t, (m.get(t) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([track_name, count]) => ({ track_name, count }))
      .sort((a, b) => b.count - a.count);
  }, [downloads]);

  const exportLedgerCsv = () => {
    const headers = ["created_at", "user_id", "email", "delta", "balance_after", "entry_type", "ref_id"];
    const lines = [
      headers.join(","),
      ...ledger.map((r) =>
        [
          r.created_at,
          r.user_id,
          emailByUser[r.user_id] ?? "",
          r.delta,
          r.balance_after,
          r.entry_type,
          r.ref_id ?? "",
        ]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "credit-ledger.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-foreground/50 hover:text-foreground mb-6 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground font-heading">Reports</h1>
              <p className="text-muted-foreground text-sm mt-1">Downloads, tracks, and credit ledger.</p>
            </div>
          </div>

          <Tabs defaultValue="downloads">
            <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
              <TabsTrigger value="downloads">By racecard</TabsTrigger>
              <TabsTrigger value="tracks">By track</TabsTrigger>
              <TabsTrigger value="ledger">Credit ledger</TabsTrigger>
            </TabsList>

            <TabsContent value="downloads">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Downloads per racecard</CardTitle>
                  <CardDescription>Total download events (including repeat users).</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {loading ? (
                    <LoaderRow />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Track</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>File</TableHead>
                          <TableHead className="text-right">Downloads</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byRacecard.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-foreground">{r.track_name}</TableCell>
                            <TableCell className="text-muted-foreground">{r.race_date}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.file_name}</TableCell>
                            <TableCell className="text-right font-mono-data">{r.count}</TableCell>
                          </TableRow>
                        ))}
                        {byRacecard.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              No download data
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tracks">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Downloads by track</CardTitle>
                  <CardDescription>Aggregated across all racecards for that track label.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {loading ? (
                    <LoaderRow />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Track</TableHead>
                          <TableHead className="text-right">Downloads</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byTrack.map((r) => (
                          <TableRow key={r.track_name}>
                            <TableCell className="text-foreground">{r.track_name}</TableCell>
                            <TableCell className="text-right font-mono-data">{r.count}</TableCell>
                          </TableRow>
                        ))}
                        {byTrack.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                              No download data
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ledger">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-foreground">Credit ledger</CardTitle>
                    <CardDescription>Purchases, admin grants, and download deductions (latest 500).</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={exportLedgerCsv} disabled={!ledger.length}>
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {loading ? (
                    <LoaderRow />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead className="text-right">Δ</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledger.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(r.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs">
                              {emailByUser[r.user_id] ?? r.user_id.slice(0, 8)}
                            </TableCell>
                            <TableCell className="text-right font-mono-data">{r.delta}</TableCell>
                            <TableCell className="text-right font-mono-data">{r.balance_after}</TableCell>
                            <TableCell className="text-xs capitalize text-muted-foreground">{r.entry_type.replace(/_/g, " ")}</TableCell>
                          </TableRow>
                        ))}
                        {ledger.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No ledger rows yet (starts after migration + new activity).
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

function LoaderRow() {
  return (
    <div className="flex justify-center py-12 text-muted-foreground gap-2">
      <Loader2 className="h-5 w-5 animate-spin" />
      Loading…
    </div>
  );
}

export default AdminReports;
