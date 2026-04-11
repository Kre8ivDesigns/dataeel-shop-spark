import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { sanitizeError } from "@/lib/errorHandler";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type PageRow = Tables<"pages">;

const AdminPages = () => {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("pages").select("*").order("updated_at", { ascending: false });
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

  const togglePublished = async (row: PageRow, published: boolean) => {
    const { error } = await supabase.from("pages").update({ published, updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) {
      toast.error(sanitizeError(error));
      return;
    }
    toast.success(published ? "Published" : "Unpublished (hidden from public)");
    load();
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-foreground/50 hover:text-foreground mb-6 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground font-heading">Pages</h1>
            <p className="text-muted-foreground text-sm mt-1">Drafts stay private until published.</p>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">All pages</CardTitle>
              <CardDescription>Open in the visual editor to change HTML/CSS.</CardDescription>
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
                      <TableHead>Slug</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm text-foreground">{r.slug}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.title || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.updated_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Switch checked={r.published} onCheckedChange={(v) => togglePublished(r, v)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin/page-editor?slug=${encodeURIComponent(r.slug)}`}>
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                          No pages yet. Create one in the page editor.
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

export default AdminPages;
