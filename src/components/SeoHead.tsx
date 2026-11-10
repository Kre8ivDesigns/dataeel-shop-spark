import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { resolveSeo } from "@/lib/seo";

function setMeta(attribute: "name" | "property", key: string, content: string | null) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (content == null) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setCanonical(href: string | null) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (href == null) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

/**
 * Keeps title, description, canonical, robots, and social tags in sync with the current route.
 * Must render before <Routes> so pages that set their own title (e.g. EditablePage) apply theirs afterwards.
 */
export function SeoHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = resolveSeo(pathname);

    document.title = seo.title;
    setMeta("name", "description", seo.description);
    setMeta("name", "robots", seo.noindex ? "noindex, nofollow" : null);
    setCanonical(seo.canonical);

    setMeta("property", "og:title", seo.title);
    setMeta("property", "og:description", seo.description);
    setMeta("property", "og:url", seo.canonical);
    setMeta("name", "twitter:title", seo.title);
    setMeta("name", "twitter:description", seo.description);
  }, [pathname]);

  return null;
}
