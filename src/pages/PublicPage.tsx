import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "./NotFound";

interface PublicPageData {
  slug: string;
  title: string | null;
  html: string | null;
  css: string | null;
  meta_description: string | null;
  published: boolean;
}

/**
 * Renders a page authored in the admin Page Editor. Reads from `pages` by slug.
 * RLS allows public SELECT on pages, but we still filter by `published = true`
 * to hide drafts.
 */
const PublicPage = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PublicPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setNotFound(false);
      const { data, error } = await supabase
        .from("pages")
        .select("slug, title, html, css, meta_description, published")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setPage(data as PublicPageData);
      }
      setLoading(false);
    };

    if (slug) load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (page?.title) {
      const prev = document.title;
      document.title = page.title;
      return () => {
        document.title = prev;
      };
    }
  }, [page?.title]);

  useEffect(() => {
    if (!page?.meta_description) return;
    const tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prev = tag?.content ?? "";
    if (tag) {
      tag.content = page.meta_description;
      return () => {
        tag.content = prev;
      };
    }
    const created = document.createElement("meta");
    created.name = "description";
    created.content = page.meta_description;
    document.head.appendChild(created);
    return () => {
      created.remove();
    };
  }, [page?.meta_description]);

  if (notFound) return <NotFound />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-[1400px]">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : page ? (
            <>
              {page.css ? <style dangerouslySetInnerHTML={{ __html: page.css }} /> : null}
              <article
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: page.html || "" }}
              />
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicPage;
