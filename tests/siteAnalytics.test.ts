import { describe, expect, it } from "vitest";
import { classifyTrafficSource, summarizeSiteAnalytics, type SiteAnalyticsEventRow } from "@/lib/siteAnalytics";

function event(
  partial: Partial<SiteAnalyticsEventRow> &
    Pick<SiteAnalyticsEventRow, "created_at" | "event_name" | "visitor_id" | "session_id" | "path">,
): SiteAnalyticsEventRow {
  return {
    user_id: null,
    page_title: null,
    referrer: null,
    referrer_host: null,
    source: "direct",
    medium: "none",
    campaign: null,
    content: null,
    term: null,
    device_type: "desktop",
    is_new_visitor: true,
    first_seen_at: partial.created_at,
    properties: null,
    ...partial,
  };
}

describe("classifyTrafficSource", () => {
  it("uses UTM fields before referrer inference", () => {
    expect(
      classifyTrafficSource("?utm_source=newsletter&utm_medium=email&utm_campaign=may", "https://google.com/search"),
    ).toMatchObject({
      source: "newsletter",
      medium: "email",
      campaign: "may",
    });
  });

  it("detects paid search and direct visits", () => {
    expect(classifyTrafficSource("?gclid=abc", null)).toMatchObject({ source: "google", medium: "cpc" });
    expect(classifyTrafficSource("", null)).toMatchObject({ source: "direct", medium: "none" });
  });
});

describe("summarizeSiteAnalytics", () => {
  it("calculates bounce, visitor split, sources, and funnel rates", () => {
    const now = new Date("2026-05-09T12:00:00.000Z");
    const rows: SiteAnalyticsEventRow[] = [
      event({
        created_at: "2026-05-08T10:00:00.000Z",
        event_name: "page_view",
        visitor_id: "v1",
        session_id: "s1",
        path: "/",
        source: "google",
        medium: "organic",
      }),
      event({
        created_at: "2026-05-08T10:01:00.000Z",
        event_name: "page_view",
        visitor_id: "v1",
        session_id: "s1",
        path: "/pricing",
        source: "google",
        medium: "organic",
      }),
      event({
        created_at: "2026-05-08T10:02:00.000Z",
        event_name: "page_view",
        visitor_id: "v1",
        session_id: "s1",
        path: "/buy-credits",
        source: "google",
        medium: "organic",
      }),
      event({
        created_at: "2026-05-08T10:03:00.000Z",
        event_name: "checkout_started",
        visitor_id: "v1",
        session_id: "s1",
        path: "/buy-credits",
        source: "google",
        medium: "organic",
      }),
      event({
        created_at: "2026-05-08T11:00:00.000Z",
        event_name: "page_view",
        visitor_id: "v2",
        session_id: "s2",
        path: "/pricing",
        source: "direct",
        medium: "none",
      }),
      event({
        created_at: "2026-05-08T12:00:00.000Z",
        event_name: "page_view",
        visitor_id: "v3",
        session_id: "s3",
        path: "/",
        source: "facebook",
        medium: "social",
        first_seen_at: "2026-04-01T12:00:00.000Z",
        is_new_visitor: false,
      }),
    ];

    const summary = summarizeSiteAnalytics(
      rows,
      [{ created_at: "2026-05-08T10:10:00.000Z", status: "completed", user_id: "u1" }],
      30,
      now,
    );

    expect(summary.visitors).toBe(3);
    expect(summary.newVisitors).toBe(2);
    expect(summary.returningVisitors).toBe(1);
    expect(summary.sessions).toBe(3);
    expect(summary.bounceRate).toBe(66.7);
    expect(summary.pricingToBuyRate).toBe(50);
    expect(summary.checkoutCompletionRate).toBe(100);
    expect(summary.topSources[0]).toMatchObject({ source: "google", medium: "organic", visitors: 1 });
  });
});
