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

const AdminSupport = () => {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) {
      toast.error(sanitizeError(error));
      return;
    }
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const saveRow = async (row: Submission, patch: Partial<Submission>) => {
    setSavingId(row.id);
    const { error } = await supabase
      .from("contact_submissions")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setSavingId(null);
    if (error) {
      toast.error(sanitizeError(error));
      return;
    }
    toast.success("Saved");
    load();
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
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm align-top">
                          <div className="text-foreground font-medium">{r.name}</div>
                          <div className="text-muted-foreground text-xs">{r.email}</div>
                          {r.user_id && (
                            <div className="text-[10px] font-mono text-muted-foreground mt-1">{r.user_id.slice(0, 8)}…</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm align-top text-foreground capitalize">{r.category}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[240px] align-top">
                          <p className="line-clamp-4 whitespace-pre-wrap">{r.message}</p>
                        </TableCell>
                        <TableCell className="align-top">
                          <Select
                            value={r.status}
                            onValueChange={(status) => saveRow(r, { status })}
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
                            defaultValue={r.admin_notes ?? ""}
                            placeholder="Internal notes…"
                            className="min-h-[72px] text-xs bg-muted border-border"
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v !== (r.admin_notes ?? "").trim()) {
                                saveRow(r, { admin_notes: v || null });
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
