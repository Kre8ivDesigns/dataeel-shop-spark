import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Download, Loader2 } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { sanitizeError } from "@/lib/errorHandler";
import {
  creditLedgerDetail,
  creditLedgerEntryTypeLabel,
  creditLedgerUserDisplay,
  emailByUserIdFromProfiles,
  formatLedgerBalance,
  formatLedgerDelta,
  ledgerRacecardLabel,
  type LedgerRacecard,
} from "@/lib/adminCreditLedger";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type LedgerRow = Tables<"credit_ledger">;

type DownloadJoin = {
  racecard_id: string;
  user_id: string;
  created_at: string;
  racecards: { track_name: string; track_code: string; race_date: string; file_name: string } | null;
};

const AdminReports = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [downloads, setDownloads] = useState<DownloadJoin[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; email: string }[]>([]);
  const [ledgerRacecards, setLedgerRacecards] = useState<Record<string, LedgerRacecard>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLedgerError(null);
    const [ledRes, dlRes] = await Promise.all([
      supabase.from("credit_ledger").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("racecard_download_events")
        .select("racecard_id, user_id, created_at, racecards(track_name, track_code, race_date, file_name)")
        .order("created_at", { ascending: false }),
    ]);
    if (dlRes.error) toast.error(sanitizeError(dlRes.error));
    const downloadRows = (dlRes.data as DownloadJoin[]) ?? [];
    setDownloads(downloadRows);

    if (ledRes.error) {
      const msg = sanitizeError(ledRes.error);
      setLedgerError(msg);
      toast.error(msg);
      setLedger([]);
    } else {
      setLedger(ledRes.data ?? []);
    }

    const ledgerRows = ledRes.error ? [] : (ledRes.data ?? []);

    // Racecards referenced by download deductions, so the ledger Details column can
    // name which racecard each credit was spent on. Prefer the already-joined event
    // rows, then fill any gaps with a direct racecards lookup.
    const racecardMap: Record<string, LedgerRacecard> = {};
    for (const d of downloadRows) {
      if (d.racecards) {
        racecardMap[d.racecard_id] = {
          track_name: d.racecards.track_name,
          race_date: d.racecards.race_date,
          file_name: d.racecards.file_name,
        };
      }
    }
    const missingRacecardIds = [
      ...new Set(
        ledgerRows
          .filter((r) => r.entry_type === "download_deduction" && r.ref_id && !racecardMap[r.ref_id])
          .map((r) => r.ref_id as string),
      ),
    ];
    if (missingRacecardIds.length > 0) {
      const rcRes = await supabase
        .from("racecards")
        .select("id, track_name, race_date, file_name")
        .in("id", missingRacecardIds);
      if (!rcRes.error) {
        for (const rc of rcRes.data ?? []) {
          racecardMap[rc.id] = {
            track_name: rc.track_name,
            race_date: rc.race_date,
            file_name: rc.file_name,
          };
        }
      }
    }
    setLedgerRacecards(racecardMap);

    const ids = [
      ...new Set([
        ...ledgerRows.map((r) => r.user_id),
        ...downloadRows.map((d) => d.user_id),
      ]),
    ];
    if (ids.length === 0) {
      setProfiles([]);
    } else {
      const profRes = await supabase.from("profiles").select("user_id, email").in("user_id", ids);
      if (profRes.error) {
        toast.error(sanitizeError(profRes.error));
        setProfiles([]);
      } else {
        setProfiles(profRes.data ?? []);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const emailByUser = useMemo(() => emailByUserIdFromProfiles(profiles), [profiles]);

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

  const byUser = useMemo(() => {
    const m = new Map<string, { count: number; lastAt: string }>();
    for (const d of downloads) {
      const cur = m.get(d.user_id) ?? { count: 0, lastAt: d.created_at };
      cur.count += 1;
      if (d.created_at > cur.lastAt) cur.lastAt = d.created_at;
      m.set(d.user_id, cur);
    }
    return Array.from(m.entries())
      .map(([user_id, v]) => ({
        user_id,
        email: emailByUser[user_id] ?? user_id,
        ...v,
      }))
      .sort((a, b) => b.count - a.count);
  }, [downloads, emailByUser]);

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

  const downloadCsv = (filename: string, lines: string[]) => {
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const exportDownloadLogCsv = () => {
    const headers = ["downloaded_at", "user_id", "email", "track_name", "race_date", "file_name", "racecard_id"];
    const lines = [
      headers.join(","),
      ...downloads.map((d) =>
        [
          d.created_at,
          d.user_id,
          emailByUser[d.user_id] ?? "",
          d.racecards?.track_name ?? "",
          d.racecards?.race_date ?? "",
          d.racecards?.file_name ?? "",
          d.racecard_id,
        ]
          .map(csvCell)
          .join(","),
      ),
    ];
    downloadCsv("racecard-download-log.csv", lines);
  };

  const exportLedgerCsv = () => {
    const headers = [
      "created_at",
      "user_id",
      "email",
      "delta",
      "balance_after",
      "entry_type",
      "ref_id",
      "racecard",
      "meta",
    ];
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
          r.entry_type === "download_deduction" && r.ref_id
            ? ledgerRacecardLabel(ledgerRacecards[r.ref_id])
            : "",
          JSON.stringify(r.meta ?? {}),
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
      <main className="pb-16">
        <PageHero
          backTo="/admin"
          backLabel="Back to Admin"
          badge="Admin"
          title={<span className="text-neon">Reports</span>}
          subtitle="Downloads, tracks, and credit ledger."
          align="left"
          containerClassName="max-w-[1400px]"
          sectionClassName="pb-8"
        />
        <div className="container mx-auto px-4 max-w-[1400px]">
          <Tabs defaultValue="users">
            <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
              <TabsTrigger value="users">By user</TabsTrigger>
              <TabsTrigger value="downloads">By racecard</TabsTrigger>
              <TabsTrigger value="tracks">By track</TabsTrigger>
              <TabsTrigger value="ledger">Credit ledger</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-foreground">Downloads by user</CardTitle>
                    <CardDescription>
                      Every download event is logged with the user and timestamp (including repeat
                      downloads). Export the full log for the complete date/time history.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={exportDownloadLogCsv}
                    disabled={!downloads.length}
                  >
                    <Download className="h-4 w-4" />
                    Export full log
                  </Button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {loading ? (
                    <LoaderRow />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead className="text-right">Downloads</TableHead>
                          <TableHead>Last download</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byUser.map((u) => (
                          <TableRow key={u.user_id}>
                            <TableCell className="text-foreground text-xs">{u.email}</TableCell>
                            <TableCell className="text-right font-mono-data">{u.count}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(u.lastAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {byUser.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
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
                    <CardDescription>
                      Purchases, admin grants, and download deductions (latest 500). Unlimited packages and free
                      downloads show markers in Δ / Balance / Details.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={exportLedgerCsv}
                    disabled={!ledger.length || Boolean(ledgerError)}
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {loading ? (
                    <LoaderRow />
                  ) : ledgerError ? (
                    <div className="flex flex-col items-start gap-3 py-6">
                      <p className="text-destructive text-sm">{ledgerError}</p>
                      <Button variant="outline" size="sm" onClick={() => void load()}>
                        Try again
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead className="text-right">Δ</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledger.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(r.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs">
                              {creditLedgerUserDisplay(r.user_id, emailByUser)}
                            </TableCell>
                            <TableCell className="text-right font-mono-data">
                              {formatLedgerDelta(r.delta, r.meta)}
                            </TableCell>
                            <TableCell className="text-right font-mono-data">
                              {formatLedgerBalance(r.balance_after, r.meta)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {creditLedgerEntryTypeLabel(r.entry_type)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                              {creditLedgerDetail(r, ledgerRacecards) || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {ledger.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No ledger rows yet.
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
