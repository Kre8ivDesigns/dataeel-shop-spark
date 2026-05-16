import { ReactNode, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeCmsCss, sanitizeCmsHtml } from "@/lib/cmsHtml";
import { normalizePageSlug } from "@/lib/pageEditorSeeds";

type EditablePageRecord = {
  slug: string;
  title: string | null;
  html: string | null;
  css: string | null;
  published: boolean;
  meta_description: string | null;
};

type EditablePageProps = {
  slug: string;
  fallback: ReactNode;
};

async function fetchPublishedEditablePage(slug: string): Promise<EditablePageRecord | null> {
  const { data, error } = await supabase
    .from("pages")
    .select("slug,title,html,css,published,meta_description")
    .eq("slug", normalizePageSlug(slug))
    .eq("published", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function EditablePage({ slug, fallback }: EditablePageProps) {
  const normalizedSlug = normalizePageSlug(slug);
  const { data: page } = useQuery({
    queryKey: ["editable-page", normalizedSlug],
    queryFn: () => fetchPublishedEditablePage(normalizedSlug),
    staleTime: 30_000,
    retry: 1,
  });

  const hasEditableHtml = Boolean(page?.published && page.html?.trim());
  const safeHtml = useMemo(() => (hasEditableHtml ? sanitizeCmsHtml(page?.html ?? "") : ""), [hasEditableHtml, page?.html]);
  const safeCss = useMemo(() => (hasEditableHtml ? sanitizeCmsCss(page?.css ?? "") : ""), [hasEditableHtml, page?.css]);

  useEffect(() => {
    if (!hasEditableHtml) return;
    const previousTitle = document.title;
    const previousDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content;

    if (page?.title?.trim()) document.title = page.title.trim();
    const description = page?.meta_description?.trim();
    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }

    return () => {
      document.title = previousTitle;
      const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (meta && previousDescription != null) meta.content = previousDescription;
    };
  }, [hasEditableHtml, page?.meta_description, page?.title]);

  if (!hasEditableHtml) return <>{fallback}</>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {safeCss ? <style>{safeCss}</style> : null}
      <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
    </div>
  );
}
