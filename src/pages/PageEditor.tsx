import "grapesjs/dist/css/grapes.min.css";
import GrapesJS from "grapesjs";
import gjsPresetWebpage from "grapesjs-preset-webpage";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { sanitizeError } from "@/lib/errorHandler";

const PageEditor = () => {
  const editorEl = useRef(null);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const slugFromUrl = searchParams.get("slug");

  const [editor, setEditor] = useState<ReturnType<typeof GrapesJS.init> | null>(null);
  const [slug, setSlug] = useState(slugFromUrl || "");
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(true);
  const [metaDescription, setMetaDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (slugFromUrl && slugFromUrl !== slug) {
      setSlug(slugFromUrl);
    }
  }, [slugFromUrl, slug]);

  useEffect(() => {
    if (editorEl.current && !editor) {
      const editorInstance = GrapesJS.init({
        container: editorEl.current,
        fromElement: true,
        height: "calc(100vh - 200px)",
        width: "auto",
        storageManager: false,
        plugins: [(e) => gjsPresetWebpage(e, {})],
        assetManager: {
          uploadFile: async (uploadEvent: Event) => {
            const input = uploadEvent as unknown as { dataTransfer?: DataTransfer; target?: HTMLInputElement };
            const files: File[] = Array.from(
              input.dataTransfer?.files ?? (input.target as HTMLInputElement | undefined)?.files ?? []
            );
            if (!files.length) return;
            const uploads = await Promise.all(
              files.map(async (file) => {
                // Sanitize filename: keep only safe characters
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.{2,}/g, "_");
                const path = `uploads/${Date.now()}-${safeName}`;
                const { data, error } = await supabase.storage
                  .from("page-media")
                  .upload(path, file, { upsert: false });
                if (error || !data) return null;
                const { data: urlData } = supabase.storage
                  .from("page-media")
                  .getPublicUrl(data.path);
                return urlData.publicUrl;
              })
            );
            editorInstance.AssetManager.add(uploads.filter(Boolean).map((src) => ({ src })));
          },
        },
      });
      setEditor(editorInstance);
    }
  }, [editor]);

  const loadPage = async () => {
    if (!editor || !slug) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("pages")
      .select("html, css, title, published, meta_description")
      .eq("slug", slug)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      toast({ title: "Error loading page", description: sanitizeError(error), variant: "destructive" });
    } else if (data) {
      editor.setComponents(data.html || "");
      editor.setStyle(data.css || "");
      setTitle(data.title || "");
      setPublished(data.published ?? true);
      setMetaDescription(data.meta_description || "");
    } else {
      editor.setComponents("");
      editor.setStyle("");
      setTitle("");
      setPublished(true);
      setMetaDescription("");
    }
    setLoading(false);
  };

  const savePage = async () => {
    if (!editor || !slug) return;
    setLoading(true);
    const html = editor.getHtml();
    const css = editor.getCss();
    const now = new Date().toISOString();

    const { error } = await supabase.from("pages").upsert(
      {
        slug,
        html,
        css,
        title: title.trim() || null,
        published,
        meta_description: metaDescription.trim() || null,
        updated_at: now,
      },
      { onConflict: "slug" },
    );

    if (error) {
      toast({ title: "Error saving page", description: sanitizeError(error), variant: "destructive" });
    } else {
      toast({ title: "Page saved successfully" });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPage();
  }, [editor, slug]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="p-4 bg-card border-b border-border flex flex-col gap-3 lg:flex-row lg:items-end lg:flex-wrap">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/pages">Pages</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">Admin</Link>
          </Button>
        </div>
        <div className="flex flex-1 flex-wrap gap-3 items-end min-w-0">
          <div className="space-y-1 min-w-[140px]">
            <Label className="text-xs text-muted-foreground">Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="homepage"
              className="bg-muted border-border font-mono text-sm"
            />
          </div>
          <div className="space-y-1 flex-1 min-w-[160px] max-w-md">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title"
              className="bg-muted border-border text-sm"
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch id="page-published" checked={published} onCheckedChange={setPublished} />
            <Label htmlFor="page-published" className="text-sm text-foreground cursor-pointer">
              Published
            </Label>
          </div>
        </div>
        <Button onClick={savePage} disabled={loading || !slug} className="shrink-0">
          Save
        </Button>
      </div>
      <div className="px-4 py-2 border-b border-border bg-muted/30">
        <Label className="text-xs text-muted-foreground">Meta description (SEO)</Label>
        <Input
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          placeholder="Short summary for search results"
          className="mt-1 bg-background border-border text-sm max-w-3xl"
        />
      </div>
      <div ref={editorEl} className="flex-grow min-h-0" />
    </div>
  );
};

export default PageEditor;
