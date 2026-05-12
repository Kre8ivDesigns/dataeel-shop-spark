import { describe, expect, it } from "vitest";
import { getFeaturedInsight, getInsightBySlug, getRelatedInsights, insightArticles } from "./insights";

describe("insights catalog", () => {
  it("exposes unique article slugs", () => {
    const slugs = insightArticles.map((article) => article.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("finds featured, slugged, and related articles", () => {
    const featured = getFeaturedInsight();

    expect(featured.featured).toBe(true);
    expect(getInsightBySlug(featured.slug)).toBe(featured);
    expect(getInsightBySlug("missing")).toBeUndefined();
    expect(getRelatedInsights(featured.slug)).not.toContain(featured);
  });
});
