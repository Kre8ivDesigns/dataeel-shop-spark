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
});
