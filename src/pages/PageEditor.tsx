import "grapesjs/dist/css/grapes.min.css";
import grapesjs from "grapesjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Loader2, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  buildFrontendSeedUpserts,
  getFrontendPageSeed,
  normalizePageSlug,
  pathForPageSlug,
} from "@/lib/pageEditorSeeds";
import type { Database } from "@/integrations/supabase/types";

type PageRow = Database["public"]["Tables"]["pages"]["Row"];
type PageUpdate = Database["public"]["Tables"]["pages"]["Update"];
type GrapesEditor = grapesjs.Editor;

const EDITOR_QUERY_KEY = (slug: string) => ["page-editor", slug];

async function fetchPage(slug: string): Promise<PageRow | null> {
  const { data, error } = await supabase
    .from("pages")
    .select("id,slug,html,css,created_at,updated_at,title,published,meta_description")
    .eq("slug", normalizePageSlug(slug))
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchSeedContext() {
  const { data, error } = await supabase.from("pages").select("slug,html,css");
  if (error) throw error;
  return data ?? [];
}

function addEditorBlocks(editor: GrapesEditor) {
  const bm = editor.BlockManager;
  bm.add("dataeel-hero", {
    label: "Hero",
    category: "DATAEEL",
    content: `
      <section class="pe-hero">
        <div class="pe-shell">
          <div class="pe-pill"><strong>Recent results snapshot:</strong> 18 winner calls / 22 exotics posted</div>
          <h1 class="pe-title">Stop Guessing. Start Reading the Race Smarter.</h1>
          <p class="pe-subtitle">Algorithm-powered RaceCards for 28+ tracks. See the Concert&trade; and Aptitude&trade; picks in a simple PDF.</p>
          <div class="pe-actions"><a class="pe-button" href="/racecards">Today Races</a><a class="pe-button-secondary" href="/pricing">View Pricing</a></div>
        </div>
      </section>`,
  });
  bm.add("dataeel-section", {
    label: "Section",
    category: "DATAEEL",
    content: `<section class="pe-section"><div class="pe-shell"><h2 class="pe-section-title">Section <span class="pe-neon">headline</span></h2><p class="pe-section-subtitle">Add supporting copy here.</p></div></section>`,
  });
  bm.add("dataeel-card-grid", {
    label: "3 Cards",
    category: "DATAEEL",
    content: `<div class="pe-grid-3"><article class="pe-card"><h3>Card title</h3><p>Card copy.</p></article><article class="pe-card"><h3>Card title</h3><p>Card copy.</p></article><article class="pe-card"><h3>Card title</h3><p>Card copy.</p></article></div>`,
  });
  bm.add("dataeel-cta", {
    label: "CTA",
    category: "DATAEEL",
    content: `<section class="pe-section pe-cta"><div class="pe-shell"><h2 class="pe-section-title">Ready to Make <span class="pe-neon">Smarter Bets?</span></h2><p>Get your next RaceCard today.</p><a class="pe-button" href="/racecards">Get Today's Cards</a></div></section>`,
  });
}

const PageEditor = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSlug = normalizePageSlug(searchParams.get("slug") || "home");
  const [slug, setSlug] = useState(initialSlug);
  const [title, setTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [published, setPublished] = useState(true);
  const [editorReady, setEditorReady] = useState(false);
  const [hasLoadedPage, setHasLoadedPage] = useState(false);
  const editorRef = useRef<GrapesEditor | null>(null);
  const editorElRef = useRef<HTMLDivElement | null>(null);

  const normalizedSlug = useMemo(() => normalizePageSlug(slug), [slug]);
  const { data: page, isLoading, isError, error } = useQuery({
    queryKey: EDITOR_QUERY_KEY(initialSlug),
    queryFn: () => fetchPage(initialSlug),
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const existing = await fetchSeedContext();
      const rows = buildFrontendSeedUpserts(existing);
      if (rows.length > 0) {
        const { error: upsertError } = await supabase.from("pages").upsert(rows, { onConflict: "slug" });
        if (upsertError) throw upsertError;
      }
      return rows.length;
    },
    onSuccess: async (count) => {
      await queryClient.invalidateQueries();
      toast.success(count === 0 ? "Frontend seed is already current." : `Seeded ${count} editable frontend page${count === 1 ? "" : "s"}.`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not seed frontend pages."),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const editor = editorRef.current;
      if (!editor) throw new Error("Editor is not ready.");
      const cleanSlug = normalizePageSlug(slug);
      const payload: PageUpdate & { slug: string } = {
        slug: cleanSlug,
        title: title.trim() || cleanSlug,
        meta_description: metaDescription.trim() || null,
        published,
        html: editor.getHtml(),
        css: editor.getCss(),
        updated_at: new Date().toISOString(),
      };
      const { error: upsertError } = await supabase.from("pages").upsert(payload, { onConflict: "slug" });
      if (upsertError) throw upsertError;
      return cleanSlug;
    },
    onSuccess: async (savedSlug) => {
      await queryClient.invalidateQueries();
      setSearchParams({ slug: savedSlug }, { replace: true });
      toast.success("Page saved.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save page."),
  });

  useEffect(() => {
    setHasLoadedPage(false);
  }, [initialSlug]);

  const resetFromFrontendSeed = () => {
    const seed = getFrontendPageSeed(normalizedSlug);
    const editor = editorRef.current;
    if (!seed || !editor) {
      toast.error("No frontend seed is available for this slug.");
      return;
    }
    setTitle(seed.title);
    setMetaDescription(seed.metaDescription);
    setPublished(seed.published);
    editor.setComponents(seed.html);
    editor.setStyle(seed.css);
    toast.success("Loaded the current frontend seed into the editor.");
  };

  useEffect(() => {
    if (!editorElRef.current || editorRef.current) return;

    const editor = grapesjs.init({
      container: editorElRef.current,
      height: "calc(100vh - 118px)",
      width: "100%",
      storageManager: false,
      noticeOnUnload: 0,
      fromElement: false,
      components: "",
      style: "",
      canvas: {
        styles: [
          "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap",
        ],
      },
      panels: { defaults: [] },
      blockManager: { appendTo: "#page-editor-blocks" },
      styleManager: { appendTo: "#page-editor-styles" },
      layerManager: { appendTo: "#page-editor-layers" },
      selectorManager: { appendTo: "#page-editor-selectors" },
    });

    addEditorBlocks(editor);
    editorRef.current = editor;
    setEditorReady(true);

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!editorReady || isLoading || hasLoadedPage) return;
    const seed = getFrontendPageSeed(initialSlug);
    const editableHtml = page?.html?.trim() || seed?.html || "";
    const editableCss = page?.css?.trim() || seed?.css || "";

    setSlug(normalizePageSlug(page?.slug || initialSlug));
    setTitle(page?.title || seed?.title || initialSlug);
    setMetaDescription(page?.meta_description || seed?.metaDescription || "");
    setPublished(page?.published ?? seed?.published ?? true);
    editorRef.current?.setComponents(editableHtml);
    editorRef.current?.setStyle(editableCss);
    setHasLoadedPage(true);
  }, [editorReady, hasLoadedPage, initialSlug, isLoading, page]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-border bg-card">
          <div className="flex flex-col gap-4 px-4 py-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <Button asChild variant="ghost" size="sm" className="mb-2 gap-2 px-0 text-muted-foreground hover:bg-transparent">
                <Link to="/admin/pages">
                  <ArrowLeft className="h-4 w-4" />
                  Pages
                </Link>
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Page Editor</h1>
                <Badge variant={published ? "default" : "secondary"}>{published ? "Published" : "Draft"}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Saved published content renders on the matching public route. Missing or blank pages fall back to the existing React frontend.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" disabled={seedMutation.isPending} onClick={() => seedMutation.mutate()}>
                {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Seed all frontend copies
              </Button>
              <Button variant="outline" className="gap-2" onClick={resetFromFrontendSeed}>
                <Wand2 className="h-4 w-4" />
                Load seed for this page
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <a href={pathForPageSlug(normalizedSlug)} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4" />
                  View route
                </a>
              </Button>
              <Button className="gap-2" disabled={!editorReady || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save page
              </Button>
            </div>
          </div>
        </header>

        {isError ? (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error instanceof Error ? error.message : "Could not load page."}
          </div>
        ) : null}

        <div className="grid flex-1 min-h-0 xl:grid-cols-[330px_minmax(0,1fr)_330px]">
          <aside className="min-h-0 overflow-y-auto border-r border-border bg-card/70 p-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="page-slug">Slug</Label>
                <Input id="page-slug" value={slug} onChange={(event) => setSlug(normalizePageSlug(event.target.value))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="page-title">Title</Label>
                <Input id="page-title" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="page-description">Meta description</Label>
                <Textarea id="page-description" value={metaDescription} rows={3} onChange={(event) => setMetaDescription(event.target.value)} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <Label htmlFor="page-published">Published</Label>
                  <p className="text-xs text-muted-foreground">Only published pages can render publicly.</p>
                </div>
                <Switch id="page-published" checked={published} onCheckedChange={setPublished} />
              </div>
              <div>
                <h2 className="mb-2 text-sm font-semibold">Blocks</h2>
                <div id="page-editor-blocks" className="page-editor-panel" />
              </div>
            </div>
          </aside>

          <main className="min-w-0 bg-background">
            {!editorReady ? (
              <div className="flex h-full min-h-[520px] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                Loading editor
              </div>
            ) : null}
            <div ref={editorElRef} className="h-full" />
          </main>

          <aside className="min-h-0 overflow-y-auto border-l border-border bg-card/70 p-4">
            <div className="space-y-5">
              <div>
                <h2 className="mb-2 text-sm font-semibold">Layers</h2>
                <div id="page-editor-layers" className="page-editor-panel" />
              </div>
              <div>
                <h2 className="mb-2 text-sm font-semibold">Selector</h2>
                <div id="page-editor-selectors" className="page-editor-panel" />
              </div>
              <div>
                <h2 className="mb-2 text-sm font-semibold">Styles</h2>
                <div id="page-editor-styles" className="page-editor-panel" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PageEditor;
