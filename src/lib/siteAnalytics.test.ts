import { describe, expect, it } from "vitest";
import {
  buildRetentionConversionDiagnosis,
  type AnalyticsSummary,
  type DiagnosisArea,
} from "./siteAnalytics";

type DiagnosisInput = Omit<AnalyticsSummary, "diagnosis">;

/** A healthy baseline with enough volume; override fields per scenario. */
function baseSummary(overrides: Partial<DiagnosisInput> = {}): DiagnosisInput {
  return {
    visitors: 200,
    newVisitors: 120,
    returningVisitors: 80, // 40% returning -> healthy
    sessions: 240,
    bounceRate: 40,
    pageViews: 600,
    avgPagesPerSession: 2.5,
    pricingVisitors: 60,
    buyCreditsVisitors: 40,
    checkoutStarts: 20,
    completedPurchases: 16,
    pricingToBuyRate: 67,
    checkoutStartRate: 50,
    checkoutCompletionRate: 80,
    topSources: [],
    deviceBreakdown: [],
    topLandingPages: [],
    topCtaClicks: [],
    racecardsFunnel: {
      racecardsVisitors: 100,
      dateChanges: 10,
      searches: 10,
      cardExpansions: 20,
      joinClicks: 15,
      signupCompletions: 30,
    },
    signupFunnel: { starts: 50, submits: 40, failures: 2, completions: 30 },
    utmCoverage: { attributedVisitors: 120, directVisitors: 80, percentAttributed: 60, campaignVisitors: 40 },
    topExitPages: [],
    issues: [],
    ...overrides,
  };
}

const areas = (findings: { area: DiagnosisArea }[]) => new Set(findings.map((f) => f.area));

describe("buildRetentionConversionDiagnosis", () => {
  it("flags small samples instead of guessing", () => {
    const result = buildRetentionConversionDiagnosis(baseSummary({ visitors: 4, sessions: 3 }));
    expect(result.headline).toMatch(/not enough traffic/i);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].area).toBe("Acquisition");
  });

  it("detects poor retention when visitors do not return", () => {
    const result = buildRetentionConversionDiagnosis(
      baseSummary({ visitors: 200, newVisitors: 190, returningVisitors: 10 }), // 5% returning
    );
    const retention = result.findings.find((f) => f.area === "Retention" && f.severity === "high");
    expect(retention?.title).toMatch(/comes back/i);
    expect(result.headline).toMatch(/retention/i);
  });

  it("detects a high bounce rate as a retention problem", () => {
    const result = buildRetentionConversionDiagnosis(baseSummary({ bounceRate: 72, avgPagesPerSession: 1.1 }));
    expect(result.findings.some((f) => f.area === "Retention" && /bounce/i.test(f.title))).toBe(true);
  });

  it("detects registration drop-off", () => {
    const result = buildRetentionConversionDiagnosis(
      baseSummary({ signupFunnel: { starts: 40, submits: 20, failures: 8, completions: 10 } }), // 25% finish
    );
    const reg = result.findings.find((f) => f.area === "Registration" && f.severity === "high");
    expect(reg?.finding).toMatch(/abandoned|started signup/i);
  });

  it("detects when few visitors even start registration", () => {
    const result = buildRetentionConversionDiagnosis(
      baseSummary({ visitors: 200, signupFunnel: { starts: 2, submits: 1, failures: 0, completions: 1 } }),
    );
    expect(result.findings.some((f) => f.area === "Registration" && /start registration/i.test(f.title))).toBe(true);
  });

  it("detects purchase-funnel leakage at checkout", () => {
    const result = buildRetentionConversionDiagnosis(
      baseSummary({ checkoutStarts: 20, completedPurchases: 4, checkoutCompletionRate: 20 }),
    );
    expect(result.findings.some((f) => f.area === "Purchasing" && /purchases/i.test(f.title))).toBe(true);
  });

  it("reports a clean bill of health on healthy metrics", () => {
    const result = buildRetentionConversionDiagnosis(baseSummary());
    expect(result.headline).toMatch(/no major/i);
    // Healthy baseline should surface positive (good) notes, not high-severity blockers.
    expect(result.findings.every((f) => f.severity !== "high")).toBe(true);
    expect(areas(result.findings).size).toBeGreaterThan(0);
  });

  it("always reports an end-to-end visitor → purchase rate", () => {
    const result = buildRetentionConversionDiagnosis(baseSummary({ visitors: 200, completedPurchases: 16 }));
    expect(result.visitorToPurchaseRate).toBeCloseTo(8, 5);
  });
});
