import { describe, expect, it } from "vitest";
import {
  buildFrontendSeedUpserts,
  getFrontendPageSeed,
  isSeedablePageContent,
  normalizePageSlug,
  pathForPageSlug,
} from "./pageEditorSeeds";

describe("pageEditorSeeds", () => {
  it("normalizes route-like slugs", () => {
    expect(normalizePageSlug("/privacy-policy/")).toBe("privacy");
    expect(normalizePageSlug("/pricing")).toBe("pricing");
    expect(normalizePageSlug("")).toBe("home");
  });

  it("maps editor slugs to public paths", () => {
    expect(pathForPageSlug("home")).toBe("/");
    expect(pathForPageSlug("privacy")).toBe("/privacy-policy");
    expect(pathForPageSlug("pricing")).toBe("/pricing");
  });

  it("treats blank and legacy placeholders as seedable", () => {
    expect(isSeedablePageContent({ slug: "home", html: "", css: "" })).toBe(true);
    expect(isSeedablePageContent({ slug: "pricing", html: "<p>Choose a plan that works for you.</p>", css: "" })).toBe(true);
    expect(isSeedablePageContent({ slug: "pricing", html: "<p>Custom admin copy</p>", css: ".x{color:red}" })).toBe(false);
  });

  it("builds upserts only for missing or seedable pages", () => {
    const upserts = buildFrontendSeedUpserts([
      { slug: "home", html: "<p>Custom home</p>", css: ".home{}" },
      { slug: "pricing", html: "", css: "" },
    ]);

    expect(upserts.some((row) => row.slug === "home")).toBe(false);
    expect(upserts.some((row) => row.slug === "pricing")).toBe(true);
    expect(upserts.some((row) => row.slug === "contact")).toBe(true);
  });

  it("uses the home seed for the legacy homepage slug", () => {
    expect(getFrontendPageSeed("homepage")?.slug).toBe("home");
  });
});
