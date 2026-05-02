import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2 } from "lucide-react";
import { sanitizeError } from "@/lib/errorHandler";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Submission = Tables<"contact_submissions">;

const TICKET_STATUSES = ["open", "in_progress", "closed"] as const;
type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Accept DB quirks (whitespace, legacy labels) so Radix Select `value` always matches a SelectItem. */
function normalizeTicketStatus(raw: unknown): TicketStatus {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
  if (s === "in_progress" || s === "inprogress") return "in_progress";
  if (TICKET_STATUSES.includes(s as TicketStatus)) return s as TicketStatus;
  return "open";
}

function formatSubmissionTimestamp(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function sanitizeSubmissionRows(data: unknown): Submission[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is Submission => {
    return (
      row != null &&
      typeof row === "object" &&
      typeof (row as Submission).id === "string" &&
      (row as Submission).id.length > 0
    );
  });
}

const AdminSupport = () => {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        const msg = sanitizeError(error);
        setLoadError(msg);
        toast.error(msg);
        setRows([]);
        return;
      }
      setRows(sanitizeSubmissionRows(data));
    } catch (e: unknown) {
      const msg = sanitizeError(e);
      setLoadError(msg);
      toast.error(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const saveRow = async (row: Submission, patch: Partial<Submission>) => {
    if (!row?.id) return;
    try {
      setSavingId(row.id);
      const { error } = await supabase
        .from("contact_submissions")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) {
        toast.error(sanitizeError(error));
        return;
      }
      toast.success("Saved");
      await load();
    } catch (e: unknown) {
      toast.error(sanitizeError(e));
    } finally {
      setSavingId(null);
    }
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

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground font-heading">Support inbox</h1>
            <p className="text-muted-foreground text-sm mt-1">Messages from the public contact form.</p>
          </div>

          {loadError && (
            <p className="text-sm text-destructive mb-4" role="alert">
              {loadError}
            </p>
          )}

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Submissions</CardTitle>
              <CardDescription>Open items first; newest at top.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading…
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Received</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="min-w-[200px]">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap align-top">
                          {formatSubmissionTimestamp(r.created_at)}
                        </TableCell>
                        <TableCell className="text-sm align-top">
                          <div className="text-foreground font-medium">{r.name ?? "—"}</div>
                          <div className="text-muted-foreground text-xs">{r.email ?? "—"}</div>
                          {r.user_id != null && String(r.user_id).length > 0 && (
                            <div className="text-[10px] font-mono text-muted-foreground mt-1">
                              {String(r.user_id).slice(0, 8)}…
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm align-top text-foreground capitalize">
                          {r.category ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[240px] align-top">
                          <p className="line-clamp-4 whitespace-pre-wrap">{r.message ?? ""}</p>
                        </TableCell>
                        <TableCell className="align-top">
                          <Select
                            value={normalizeTicketStatus(r.status)}
                            onValueChange={(status) =>
                              void saveRow(r, { status: normalizeTicketStatus(status) })
                            }
                            disabled={savingId === r.id}
                          >
                            <SelectTrigger className="w-[140px] bg-muted border-border h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In progress</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top">
                          <Textarea
                            key={`${r.id}-notes-${r.updated_at ?? ""}`}
                            defaultValue={r.admin_notes ?? ""}
                            placeholder="Internal notes…"
                            className="min-h-[72px] text-xs bg-muted border-border"
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v !== (r.admin_notes ?? "").trim()) {
                                void saveRow(r, { admin_notes: v || null });
                              }
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                          No submissions yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminSupport;
