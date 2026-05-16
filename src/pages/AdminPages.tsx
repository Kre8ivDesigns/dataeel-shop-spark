import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, ExternalLink, FileText, Loader2, RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { buildFrontendSeedUpserts, pathForPageSlug } from "@/lib/pageEditorSeeds";
import type { Database } from "@/integrations/supabase/types";

type PageRow = Pick<
  Database["public"]["Tables"]["pages"]["Row"],
  "id" | "slug" | "title" | "published" | "meta_description" | "updated_at" | "html" | "css"
>;

const PAGES_QUERY_KEY = ["admin-pages"];

async function fetchPages(): Promise<PageRow[]> {
  const { data, error } = await supabase
    .from("pages")
    .select("id,slug,title,published,meta_description,updated_at,html,css")
    .order("slug", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const AdminPages = () => {
  const queryClient = useQueryClient();
  const { data: pages = [], isLoading, isError, error } = useQuery({
    queryKey: PAGES_QUERY_KEY,
    queryFn: fetchPages,
  });

  const seedableCount = useMemo(() => buildFrontendSeedUpserts(pages).length, [pages]);

  const seedMutation = useMutation({
    mutationFn: async () => {
      const rows = buildFrontendSeedUpserts(pages);
      if (rows.length === 0) return 0;
      const { error: upsertError } = await supabase.from("pages").upsert(rows, { onConflict: "slug" });
      if (upsertError) throw upsertError;
      return rows.length;
    },
    onSuccess: async (count) => {
      await queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEY });
      toast.success(count === 0 ? "Frontend seed is already current." : `Seeded ${count} editable page${count === 1 ? "" : "s"}.`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not seed frontend pages.");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error: updateError } = await supabase
        .from("pages")
        .update({ published, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (updateError) throw updateError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEY }),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not update publish status.");
    },
  });

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
              Page <span className="text-neon">editor</span>
            </>
          }
          subtitle="Manage frontend-rendered pages. Seeded pages start from the current DATAEEL frontend visual system."
          align="left"
          containerClassName="max-w-[1400px]"
          sectionClassName="pb-8"
        />

        <div className="container mx-auto max-w-[1400px] px-4 pt-6 md:pt-8">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <FileText className="h-5 w-5 text-primary" />
                    Editable frontend pages
                  </CardTitle>
                  <CardDescription>
                    Published rows render on matching public routes. Blank or missing rows fall back to the existing React frontend.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEY })}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    type="button"
                    className="gap-2"
                    disabled={seedMutation.isPending}
                    onClick={() => seedMutation.mutate()}
                  >
                    {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Seed frontend copies
                    {seedableCount > 0 ? <span className="rounded bg-primary-foreground/20 px-1.5 text-xs">{seedableCount}</span> : null}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  {error instanceof Error ? error.message : "Could not load pages."}
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : pages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No pages found. Seed frontend copies to create editable rows.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pages.map((page) => (
                        <TableRow key={page.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{page.title || page.slug}</div>
                            <div className="max-w-[420px] truncate text-xs text-muted-foreground">
                              {page.meta_description || "No meta description"}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{page.slug}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={page.published}
                                disabled={publishMutation.isPending}
                                onCheckedChange={(published) => publishMutation.mutate({ id: page.id, published })}
                              />
                              <Badge variant={page.published ? "default" : "secondary"}>
                                {page.published ? "Published" : "Draft"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatUpdatedAt(page.updated_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button asChild variant="outline" size="sm" className="gap-2">
                                <a href={pathForPageSlug(page.slug)} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                  View
                                </a>
                              </Button>
                              <Button asChild size="sm" className="gap-2">
                                <Link to={`/admin/page-editor?slug=${encodeURIComponent(page.slug)}`}>
                                  <Edit3 className="h-4 w-4" />
                                  Edit
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPages;
