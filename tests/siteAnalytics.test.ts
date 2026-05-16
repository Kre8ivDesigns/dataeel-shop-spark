import { describe, expect, it } from "vitest";
import { summarizeSiteAnalytics, type SiteAnalyticsEventRow } from "../src/lib/siteAnalytics";

const baseRow = {
  created_at: "2026-05-10T12:00:00.000Z",
  visitor_id: "visitor_1",
  session_id: "session_1",
  user_id: null,
  path: "/",
  page_title: "DATAEEL",
  referrer: null,
  referrer_host: null,
  source: "direct",
  medium: "none",
  campaign: null,
  content: null,
  term: null,
  device_type: "desktop" as const,
  is_new_visitor: true,
  first_seen_at: "2026-05-10T12:00:00.000Z",
  properties: {},
};

function event(event_name: SiteAnalyticsEventRow["event_name"], overrides: Partial<SiteAnalyticsEventRow> = {}) {
  return {
    ...baseRow,
    event_name,
    ...overrides,
  };
}

describe("summarizeSiteAnalytics", () => {
  it("does not count engaged single-page sessions as bounces", () => {
    const summary = summarizeSiteAnalytics(
      [
        event("page_view"),
        event("engaged_session_10s", { created_at: "2026-05-10T12:00:10.000Z" }),
      ],
      [],
      30,
      new Date("2026-05-10T12:01:00.000Z"),
    );

    expect(summary.sessions).toBe(1);
    expect(summary.bounceRate).toBe(0);
    expect(summary.topSources[0]?.bounceRate).toBe(0);
  });

  it("counts single-page sessions without engagement as bounces", () => {
    const summary = summarizeSiteAnalytics(
      [event("page_view")],
      [],
      30,
      new Date("2026-05-10T12:01:00.000Z"),
    );

    expect(summary.sessions).toBe(1);
    expect(summary.bounceRate).toBe(100);
    expect(summary.topSources[0]?.bounceRate).toBe(100);
  });

  it("summarizes landing pages, CTA clicks, attribution, and intent funnels", () => {
    const summary = summarizeSiteAnalytics(
      [
        event("page_view", { source: "facebook", medium: "social", campaign: "spring", path: "/racecards" }),
        event("racecard_date_changed", { created_at: "2026-05-10T12:00:05.000Z", path: "/racecards" }),
        event("racecard_search_used", { created_at: "2026-05-10T12:00:08.000Z", path: "/racecards" }),
        event("racecard_card_expanded", { created_at: "2026-05-10T12:00:12.000Z", path: "/racecards" }),
        event("cta_clicked", {
          created_at: "2026-05-10T12:00:15.000Z",
          path: "/racecards",
          properties: { label: "Join now", href: "https://dataeel.com/auth?mode=signup" },
        }),
        event("signup_started", { created_at: "2026-05-10T12:00:20.000Z", path: "/auth" }),
        event("signup_submitted", { created_at: "2026-05-10T12:00:25.000Z", path: "/auth" }),
        event("signup_completed", { created_at: "2026-05-10T12:00:30.000Z", path: "/auth" }),
      ],
      [],
      30,
      new Date("2026-05-10T12:01:00.000Z"),
    );

    expect(summary.topLandingPages[0]).toMatchObject({ path: "/racecards", visitors: 1 });
    expect(summary.topCtaClicks[0]).toMatchObject({ label: "Join now", clicks: 1, visitors: 1 });
    expect(summary.utmCoverage).toMatchObject({ attributedVisitors: 1, percentAttributed: 100, campaignVisitors: 1 });
    expect(summary.racecardsFunnel).toMatchObject({
      racecardsVisitors: 1,
      dateChanges: 1,
      searches: 1,
      cardExpansions: 1,
      joinClicks: 1,
      signupCompletions: 1,
    });
    expect(summary.signupFunnel).toMatchObject({ starts: 1, submits: 1, failures: 0, completions: 1 });
  });
});
