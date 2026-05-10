import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { trackSiteEvent } from "@/lib/siteAnalytics";

function textFromElement(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
}

function isTrackableClick(label: string, href: string | null): boolean {
  const value = `${label} ${href ?? ""}`.toLowerCase();
  return /buy|credit|pricing|purchase|checkout|download|racecard|contact|signup|login|auth/.test(value);
}

export function SiteAnalyticsTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const initialPath = useRef(location.pathname);
  const scrollDepthsTracked = useRef<Set<number>>(new Set());

  useEffect(() => {
    void trackSiteEvent("session_start", { path: initialPath.current }, user?.id);
  }, [user?.id]);

  useEffect(() => {
    void trackSiteEvent("page_view", { path: location.pathname, search: location.search }, user?.id);
  }, [location.pathname, location.search, user?.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void trackSiteEvent("engaged_session_10s", { path: location.pathname }, user?.id);
    }, 10_000);

    return () => window.clearTimeout(timeoutId);
  }, [location.pathname, user?.id]);

  useEffect(() => {
    scrollDepthsTracked.current.clear();

    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const depth = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      for (const threshold of [25, 50, 75, 100]) {
        if (depth >= threshold && !scrollDepthsTracked.current.has(threshold)) {
          scrollDepthsTracked.current.add(threshold);
          void trackSiteEvent("scroll_depth", { depth: threshold, path: location.pathname }, user?.id);
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname, user?.id]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const clickable = target.closest("a,button");
      if (!clickable) return;
      const label = textFromElement(clickable);
      const href = clickable instanceof HTMLAnchorElement ? clickable.href : null;
      if (!isTrackableClick(label, href)) return;

      void trackSiteEvent(
        "cta_clicked",
        {
          href,
          label,
          tag: clickable.tagName.toLowerCase(),
        },
        user?.id,
      );

      if ((href ?? "").includes("/how-to-read-racecard")) {
        void trackSiteEvent(
          "racecard_preview_opened",
          {
            href,
            label,
            location: "site_click",
          },
          user?.id,
        );
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [user?.id]);

  return null;
}
