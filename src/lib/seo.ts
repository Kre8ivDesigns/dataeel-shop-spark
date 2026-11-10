import { getInsightBySlug, insightArticles } from "./insights";

export const SITE_URL = "https://www.dataeel.com";
export const SITE_NAME = "DATAEEL®";

export const DEFAULT_TITLE = "DATAEEL® | Horse Racing Simplified® - Algorithmic Predictions";
export const DEFAULT_DESCRIPTION =
  "Get a full day of thoroughbred horse racing predictions for just $5. Powered by algorithms, not guesswork. 30+ tracks across the U.S. and Canada.";

export type PageSeo = {
  title: string;
  description: string;
  /** Absolute canonical URL; null when the page should not be indexed. */
  canonical: string | null;
  noindex: boolean;
};

type RouteSeo = { title: string; description: string };

/** Public, indexable routes. Keep in sync with `public/sitemap.xml` (enforced by seo.test.ts). */
export const PUBLIC_ROUTE_SEO: Record<string, RouteSeo> = {
  "/": { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  "/pricing": {
    title: "RaceCard Credits & Pricing | DATAEEL®",
    description:
      "Buy DATAEEL RaceCard credits. One credit unlocks a full track day with both Concert™ and Aptitude™ picks. Registration is free and credits never expire.",
  },
  "/racecards": {
    title: "Today's RaceCards by Track | DATAEEL®",
    description:
      "Browse available DATAEEL RaceCards by track and race date. Algorithmic thoroughbred picks for every race on the card, delivered as a downloadable PDF.",
  },
  "/how-to-read-racecard": {
    title: "How to Read a DATAEEL RaceCard | DATAEEL®",
    description:
      "A step-by-step guide to reading a DATAEEL RaceCard: what each column means and how to use the Concert™ and Aptitude™ picks for every race.",
  },
  "/betting-basics": {
    title: "Horse Racing Betting Basics for Beginners | DATAEEL®",
    description:
      "New to horse racing? Learn the basics of win, place, show and exotic bets, common racing terms, and how to follow a race day with confidence.",
  },
  "/insights": {
    title: "Horse Racing Insights & RaceCard Strategy | DATAEEL®",
    description:
      "Practical articles on RaceCard strategy, betting vocabulary, track conditions, and responsible ways to think through a day at the races.",
  },
  "/contact": {
    title: "Contact Support | DATAEEL®",
    description:
      "Questions about RaceCards, credits, billing, or your account? Contact the DATAEEL support team. We aim to respond within one business day.",
  },
  "/feedback": {
    title: "Share Your Feedback | DATAEEL®",
    description: "Tell us how DATAEEL RaceCards are working for you and what we can improve.",
  },
  "/terms": {
    title: "Terms & Conditions | DATAEEL®",
    description: "The terms and conditions that govern use of the DATAEEL website, RaceCards, and credits.",
  },
  "/privacy-policy": {
    title: "Privacy Policy | DATAEEL®",
    description: "How DATAEEL collects, uses, and protects your personal information.",
  },
  "/disclaimer": {
    title: "Disclaimer | DATAEEL®",
    description:
      "DATAEEL content is for entertainment and information only. Past performance does not guarantee future results.",
  },
};

export function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function canonicalUrl(pathname: string): string {
  const path = normalizePathname(pathname);
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

/** Every indexable path on the site, including insight articles. */
export function getIndexablePaths(): string[] {
  return [...Object.keys(PUBLIC_ROUTE_SEO), ...insightArticles.map((article) => `/insights/${article.slug}`)];
}

export function resolveSeo(pathname: string): PageSeo {
  const path = normalizePathname(pathname);

  const route = PUBLIC_ROUTE_SEO[path];
  if (route) {
    return { ...route, canonical: canonicalUrl(path), noindex: false };
  }

  const insightMatch = /^\/insights\/([^/]+)$/.exec(path);
  const article = insightMatch ? getInsightBySlug(insightMatch[1]) : undefined;
  if (article) {
    return {
      title: `${article.title} | DATAEEL® Insights`,
      description: article.dek,
      canonical: canonicalUrl(path),
      noindex: false,
    };
  }

  // Account, admin, per-user, and unknown URLs must not be indexed.
  return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, canonical: null, noindex: true };
}
