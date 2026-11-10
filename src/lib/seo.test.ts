import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { insightArticles } from "./insights";
import { canonicalUrl, getIndexablePaths, PUBLIC_ROUTE_SEO, resolveSeo, SITE_URL } from "./seo";

describe("resolveSeo", () => {
  it("returns route-specific metadata with a canonical URL", () => {
    const seo = resolveSeo("/pricing");

    expect(seo.title).toBe(PUBLIC_ROUTE_SEO["/pricing"].title);
    expect(seo.canonical).toBe(`${SITE_URL}/pricing`);
    expect(seo.noindex).toBe(false);
  });

  it("normalizes trailing slashes", () => {
    expect(resolveSeo("/pricing/").canonical).toBe(`${SITE_URL}/pricing`);
    expect(canonicalUrl("/")).toBe(`${SITE_URL}/`);
  });

  it("builds metadata for insight articles from the catalog", () => {
    const article = insightArticles[0];
    const seo = resolveSeo(`/insights/${article.slug}`);

    expect(seo.title).toContain(article.title);
    expect(seo.description).toBe(article.dek);
    expect(seo.canonical).toBe(`${SITE_URL}/insights/${article.slug}`);
  });

  it.each(["/admin", "/admin/seo", "/dashboard", "/auth", "/racecards/abc-123", "/insights/missing", "/nope"])(
    "marks %s as noindex with no canonical",
    (path) => {
      const seo = resolveSeo(path);

      expect(seo.noindex).toBe(true);
      expect(seo.canonical).toBeNull();
    },
  );

  it("gives every public route a unique title and description", () => {
    const entries = Object.values(PUBLIC_ROUTE_SEO);

    expect(new Set(entries.map((entry) => entry.title)).size).toBe(entries.length);
    expect(new Set(entries.map((entry) => entry.description)).size).toBe(entries.length);
  });
});

describe("public/sitemap.xml", () => {
  it("lists exactly the indexable paths", () => {
    const xml = readFileSync(resolve(__dirname, "../../public/sitemap.xml"), "utf8");
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).sort();

    expect(locs).toEqual(getIndexablePaths().map(canonicalUrl).sort());
  });
});
