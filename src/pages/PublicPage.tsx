import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { sanitizeError } from "@/lib/errorHandler";

const PublicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [css, setCss] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [metaDescription, setMetaDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);

    supabase
      .from("pages")
      .select("html, css, title, meta_description")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Error loading page:", sanitizeError(error));
          setNotFound(true);
        } else if (!data) {
          setNotFound(true);
        } else {
          setHtml(data.html ?? "");
          setCss(data.css ?? "");
          setTitle(data.title ?? null);
          setMetaDescription(data.meta_description ?? null);
        }
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (title) document.title = `${title} | DataEel`;
  }, [title]);

  useEffect(() => {
    const existing = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      if (existing) {
        existing.setAttribute("content", metaDescription);
      } else {
        const meta = document.createElement("meta");
        meta.name = "description";
        meta.content = metaDescription;
        document.head.appendChild(meta);
      }
    }
  }, [metaDescription]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl font-bold text-foreground font-heading mb-4">Page not found</h1>
          <p className="text-muted-foreground mb-8">This page doesn't exist or hasn't been published yet.</p>
          <Link to="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const srcdoc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: sans-serif; }
  ${css ?? ""}
</style>
</head>
<body>
${html ?? ""}
</body>
</html>`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        <iframe
          srcDoc={srcdoc}
          title={title ?? slug}
          className="w-full border-0"
          style={{ minHeight: "80vh" }}
          sandbox="allow-scripts allow-forms allow-popups"
          onLoad={(e) => {
            const iframe = e.currentTarget;
            const doc = iframe.contentDocument;
            if (doc) {
              const height = doc.documentElement.scrollHeight;
              iframe.style.height = `${height}px`;
            }
          }}
        />
      </main>
      <Footer />
    </div>
  );
};

export default PublicPage;
