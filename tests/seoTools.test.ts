import { describe, expect, it } from "vitest";
import { analyzePageSeo, normalizeAuditUrl, normalizeKeywords } from "../src/lib/seoTools";

describe("seoTools", () => {
  it("normalizes keyword input", () => {
    expect(normalizeKeywords("race cards, horse racing\nRace Cards")).toEqual(["race cards", "horse racing"]);
  });

  it("analyzes markup for keyword density and on-page SEO signals", () => {
    const html = `
      <html>
        <head>
          <title>Horse Racing Race Cards</title>
          <meta name="description" content="Daily horse racing race cards with pace, class, and track insights for better handicapping.">
        </head>
        <body>
          <h1>Horse Racing Race Cards</h1>
          <h2>Race card analysis</h2>
          <p>Race cards help horse racing bettors compare pace, class, speed, and track conditions.</p>
          <img src="/racecard.png">
        </body>
      </html>
    `;

    const analysis = analyzePageSeo(html, "race cards, track bias");

    expect(analysis.title).toBe("Horse Racing Race Cards");
    expect(analysis.h1Count).toBe(1);
    expect(analysis.h2Count).toBe(1);
    expect(analysis.imagesMissingAlt).toBe(1);
    expect(analysis.keywordResults[0]).toMatchObject({ keyword: "race cards", count: 3 });
    expect(analysis.keywordResults[1]).toMatchObject({ keyword: "track bias", count: 0 });
    expect(analysis.recommendations).toContain("Add descriptive alt text to every meaningful image.");
  });

  it("normalizes relative and bare URLs", () => {
    expect(normalizeAuditUrl("/pricing", "https://dataeel.com")).toBe("https://dataeel.com/pricing");
    expect(normalizeAuditUrl("dataeel.com/racecards", "https://dataeel.com")).toBe("https://dataeel.com/racecards");
  });
});
