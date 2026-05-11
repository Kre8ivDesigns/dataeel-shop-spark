import { supabase } from "@/integrations/supabase/client";

export type SiteAnalyticsEventName =
  | "session_start"
  | "page_view"
  | "scroll_depth"
  | "engaged_session_10s"
  | "cta_clicked"
  | "racecard_preview_opened"
  | "popup_viewed"
  | "popup_dismissed"
  | "popup_converted"
  | "checkout_started"
  | "checkout_redirected"
  | "checkout_failed";

export type SiteAnalyticsEventRow = {
  created_at: string;
  event_name: SiteAnalyticsEventName | string;
  visitor_id: string;
  session_id: string;
  user_id: string | null;
  path: string | null;
  page_title: string | null;
  referrer: string | null;
  referrer_host: string | null;
  source: string;
  medium: string;
  campaign: string | null;
  content: string | null;
  term: string | null;
  device_type: "desktop" | "tablet" | "mobile";
  is_new_visitor: boolean;
  first_seen_at: string;
  properties: Record<string, unknown> | null;
};

export type TransactionAnalyticsRow = {
  created_at: string;
  status: string;
  user_id: string;
};

type StoredVisitor = {
  visitorId: string;
  firstSeenAt: string;
};

export type TrafficSource = {
  source: string;
  medium: string;
  campaign: string | null;
  content: string | null;
  term: string | null;
  referrer: string | null;
  referrerHost: string | null;
};

export type AnalyticsIssue = {
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

export type SourceSummary = {
  key: string;
  source: string;
  medium: string;
  visitors: number;
  sessions: number;
  bounceRate: number;
  checkoutStarts: number;
};

export type DeviceSummary = {
  deviceType: SiteAnalyticsEventRow["device_type"];
  visitors: number;
  sessions: number;
  percentOfVisitors: number;
};

export type AnalyticsSummary = {
  visitors: number;
  newVisitors: number;
  returningVisitors: number;
  sessions: number;
  bounceRate: number;
  pageViews: number;
  avgPagesPerSession: number;
  pricingVisitors: number;
  buyCreditsVisitors: number;
  checkoutStarts: number;
  completedPurchases: number;
  pricingToBuyRate: number;
  checkoutStartRate: number;
  checkoutCompletionRate: number;
  topSources: SourceSummary[];
  deviceBreakdown: DeviceSummary[];
  topExitPages: { path: string; exits: number }[];
  issues: AnalyticsIssue[];
};

const VISITOR_STORAGE_KEY = "dataeel.analytics.visitor";
const SESSION_STORAGE_KEY = "dataeel.analytics.session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function safeRandomId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function getStoredVisitor(now = new Date()): StoredVisitor {
  const fallback = { visitorId: safeRandomId("v"), firstSeenAt: now.toISOString() };
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredVisitor>;
      if (parsed.visitorId && parsed.firstSeenAt) {
        return { visitorId: parsed.visitorId, firstSeenAt: parsed.firstSeenAt };
      }
    }
    window.localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(fallback));
  } catch {
    return fallback;
  }
  return fallback;
}

export function getAnalyticsSessionId(now = new Date()): { sessionId: string; isNewSession: boolean } {
  const fallback = { sessionId: safeRandomId("s"), isNewSession: true };
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { sessionId?: string; touchedAt?: number };
      if (parsed.sessionId && parsed.touchedAt && now.getTime() - parsed.touchedAt < SESSION_TIMEOUT_MS) {
        window.sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({ sessionId: parsed.sessionId, touchedAt: now.getTime() }),
        );
        return { sessionId: parsed.sessionId, isNewSession: false };
      }
    }
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ sessionId: fallback.sessionId, touchedAt: now.getTime() }),
    );
  } catch {
    return fallback;
  }
  return fallback;
}

function getDeviceType(width: number): "desktop" | "tablet" | "mobile" {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function hostFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function classifyTrafficSource(
  search: string,
  referrer: string | null,
  currentHost = typeof window === "undefined" ? "" : window.location.hostname,
): TrafficSource {
  const params = new URLSearchParams(search);
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const referrerHost = hostFromUrl(referrer);

  if (utmSource || utmMedium) {
    return {
      source: (utmSource || referrerHost || "unknown").toLowerCase(),
      medium: (utmMedium || "campaign").toLowerCase(),
      campaign: params.get("utm_campaign"),
      content: params.get("utm_content"),
      term: params.get("utm_term"),
      referrer,
      referrerHost,
    };
  }

  if (params.has("gclid")) {
    return { source: "google", medium: "cpc", campaign: null, content: null, term: null, referrer, referrerHost };
  }
  if (params.has("fbclid")) {
    return { source: "facebook", medium: "social", campaign: null, content: null, term: null, referrer, referrerHost };
  }

  const normalizedCurrentHost = currentHost.replace(/^www\./, "");
  if (!referrerHost || referrerHost === normalizedCurrentHost) {
    return { source: "direct", medium: "none", campaign: null, content: null, term: null, referrer, referrerHost };
  }

  const medium = /google|bing|yahoo|duckduckgo/i.test(referrerHost)
    ? "organic"
    : /facebook|instagram|x\.com|twitter|linkedin|tiktok/i.test(referrerHost)
      ? "social"
      : "referral";

  return { source: referrerHost, medium, campaign: null, content: null, term: null, referrer, referrerHost };
}

function firstTouchSource(): TrafficSource {
  const empty = classifyTrafficSource("", null);
  if (typeof window === "undefined") return empty;

  const key = "dataeel.analytics.firstTouch";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return JSON.parse(existing) as TrafficSource;
    const source = classifyTrafficSource(window.location.search, document.referrer || null, window.location.hostname);
    window.localStorage.setItem(key, JSON.stringify(source));
    return source;
  } catch {
    return classifyTrafficSource(window.location.search, document.referrer || null, window.location.hostname);
  }
}

export async function trackSiteEvent(
  eventName: SiteAnalyticsEventName,
  properties: Record<string, unknown> = {},
  userId?: string | null,
): Promise<void> {
  if (typeof window === "undefined") return;
  const now = new Date();
  const visitor = getStoredVisitor(now);
  const session = getAnalyticsSessionId(now);
  const source = firstTouchSource();
  const firstSeenTime = new Date(visitor.firstSeenAt).getTime();
  const isNewVisitor = Number.isFinite(firstSeenTime) && now.getTime() - firstSeenTime < 24 * 60 * 60 * 1000;

  const { error } = await supabase.from("site_analytics_events").insert({
    event_name: eventName,
    visitor_id: visitor.visitorId,
    session_id: session.sessionId,
    user_id: userId ?? null,
    path: window.location.pathname,
    page_title: document.title || null,
    referrer: source.referrer,
    referrer_host: source.referrerHost,
    source: source.source,
    medium: source.medium,
    campaign: source.campaign,
    content: source.content,
    term: source.term,
    device_type: getDeviceType(window.innerWidth),
    is_new_visitor: isNewVisitor,
    first_seen_at: visitor.firstSeenAt,
    properties,
  });

  if (error && import.meta.env.DEV) {
    console.warn("[site-analytics] event insert failed", error.message);
  }
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function withinDays(createdAt: string, days: number, now: Date): boolean {
  const cutoff = now.getTime() - days * 86400000;
  return new Date(createdAt).getTime() >= cutoff;
}

function hasMeaningfulEngagement(rows: SiteAnalyticsEventRow[]): boolean {
  return rows.some((row) =>
    [
      "cta_clicked",
      "scroll_depth",
      "engaged_session_10s",
      "racecard_preview_opened",
      "popup_converted",
      "checkout_started",
      "checkout_redirected",
    ].includes(row.event_name),
  );
}

export function summarizeSiteAnalytics(
  events: SiteAnalyticsEventRow[],
  transactions: TransactionAnalyticsRow[],
  days: number,
  now = new Date(),
): AnalyticsSummary {
  const rows = events.filter((event) => withinDays(event.created_at, days, now));
  const completedPurchases = transactions.filter(
    (tx) => tx.status === "completed" && withinDays(tx.created_at, days, now),
  ).length;

  const visitorIds = new Set(rows.map((row) => row.visitor_id));
  const pageViews = rows.filter((row) => row.event_name === "page_view");
  const pricingVisitorIds = new Set(rows.filter((row) => row.path === "/pricing").map((row) => row.visitor_id));
  const buyVisitorIds = new Set(rows.filter((row) => row.path === "/buy-credits").map((row) => row.visitor_id));
  const checkoutStarts = rows.filter((row) => row.event_name === "checkout_started").length;

  const firstSeenByVisitor = new Map<string, string>();
  for (const row of rows) {
    const firstSeen = row.first_seen_at || row.created_at;
    const existing = firstSeenByVisitor.get(row.visitor_id);
    if (!existing || firstSeen < existing) firstSeenByVisitor.set(row.visitor_id, firstSeen);
  }
  const cutoff = now.getTime() - days * 86400000;
  const newVisitors = Array.from(firstSeenByVisitor.values()).filter((value) => new Date(value).getTime() >= cutoff).length;
  const returningVisitors = Math.max(visitorIds.size - newVisitors, 0);

  const sessionMap = new Map<string, SiteAnalyticsEventRow[]>();
  for (const row of rows) {
    const sessionRows = sessionMap.get(row.session_id) ?? [];
    sessionRows.push(row);
    sessionMap.set(row.session_id, sessionRows);
  }

  let bounces = 0;
  const exitPageCounts = new Map<string, number>();
  for (const sessionRows of sessionMap.values()) {
    const ordered = [...sessionRows].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const sessionPageViews = ordered.filter((row) => row.event_name === "page_view");
    if (sessionPageViews.length <= 1 && !hasMeaningfulEngagement(ordered)) bounces += 1;
    const lastPage = [...ordered].reverse().find((row) => row.path)?.path;
    if (lastPage && !ordered.some((row) => row.event_name === "checkout_started")) {
      exitPageCounts.set(lastPage, (exitPageCounts.get(lastPage) ?? 0) + 1);
    }
  }

  const sourceMap = new Map<
    string,
    {
      source: string;
      medium: string;
      visitors: Set<string>;
      sessions: Set<string>;
      bounces: number;
      checkoutStarts: number;
    }
  >();
  for (const row of rows) {
    const key = `${row.source || "direct"} / ${row.medium || "none"}`;
    const item =
      sourceMap.get(key) ??
      {
        source: row.source || "direct",
        medium: row.medium || "none",
        visitors: new Set<string>(),
        sessions: new Set<string>(),
        bounces: 0,
        checkoutStarts: 0,
      };
    item.visitors.add(row.visitor_id);
    item.sessions.add(row.session_id);
    if (row.event_name === "checkout_started") item.checkoutStarts += 1;
    sourceMap.set(key, item);
  }
  for (const [key, item] of sourceMap) {
    for (const sessionId of item.sessions) {
      const sessionRows = sessionMap.get(sessionId) ?? [];
      if (
        sessionRows.filter((row) => row.event_name === "page_view").length <= 1 &&
        !hasMeaningfulEngagement(sessionRows)
      ) {
        item.bounces += 1;
      }
    }
    sourceMap.set(key, item);
  }

  const deviceMap = new Map<
    SiteAnalyticsEventRow["device_type"],
    {
      visitors: Set<string>;
      sessions: Set<string>;
    }
  >();
  for (const row of rows) {
    const deviceType = row.device_type || "desktop";
    const item =
      deviceMap.get(deviceType) ??
      {
        visitors: new Set<string>(),
        sessions: new Set<string>(),
      };
    item.visitors.add(row.visitor_id);
    item.sessions.add(row.session_id);
    deviceMap.set(deviceType, item);
  }

  const topSources = Array.from(sourceMap.entries())
    .map(([key, item]) => ({
      key,
      source: item.source,
      medium: item.medium,
      visitors: item.visitors.size,
      sessions: item.sessions.size,
      bounceRate: percent(item.bounces, item.sessions.size),
      checkoutStarts: item.checkoutStarts,
    }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 8);

  const deviceBreakdown = Array.from(deviceMap.entries())
    .map(([deviceType, item]) => ({
      deviceType,
      visitors: item.visitors.size,
      sessions: item.sessions.size,
      percentOfVisitors: percent(item.visitors.size, visitorIds.size),
    }))
    .sort((a, b) => b.visitors - a.visitors);

  const summary: AnalyticsSummary = {
    visitors: visitorIds.size,
    newVisitors,
    returningVisitors,
    sessions: sessionMap.size,
    bounceRate: percent(bounces, sessionMap.size),
    pageViews: pageViews.length,
    avgPagesPerSession: sessionMap.size === 0 ? 0 : Math.round((pageViews.length / sessionMap.size) * 10) / 10,
    pricingVisitors: pricingVisitorIds.size,
    buyCreditsVisitors: buyVisitorIds.size,
    checkoutStarts,
    completedPurchases,
    pricingToBuyRate: percent(buyVisitorIds.size, pricingVisitorIds.size),
    checkoutStartRate: percent(checkoutStarts, buyVisitorIds.size),
    checkoutCompletionRate: percent(completedPurchases, checkoutStarts),
    topSources,
    deviceBreakdown,
    topExitPages: Array.from(exitPageCounts.entries())
      .map(([path, exits]) => ({ path, exits }))
      .sort((a, b) => b.exits - a.exits)
      .slice(0, 6),
    issues: [],
  };

  summary.issues = buildAnalyticsIssues(summary);
  return summary;
}

function buildAnalyticsIssues(summary: Omit<AnalyticsSummary, "issues">): AnalyticsIssue[] {
  const issues: AnalyticsIssue[] = [];

  if (summary.sessions > 10 && summary.bounceRate >= 55) {
    issues.push({
      severity: "high",
      title: "Bounce rate is above the healthy range",
      detail: `${summary.bounceRate}% of sessions leave without a second page or meaningful engagement. Tighten the first screen offer and make the RaceCard sample and purchase path visible before users scroll.`,
    });
  }

  if (summary.pricingVisitors >= 5 && summary.pricingToBuyRate < 35) {
    issues.push({
      severity: "medium",
      title: "Pricing visitors are not moving into checkout selection",
      detail: `Only ${summary.pricingToBuyRate}% of pricing visitors reach Buy Credits. The package cards may need stronger CTA contrast, clearer credit value, or less hesitation around how RaceCards work.`,
    });
  }

  if (summary.buyCreditsVisitors >= 5 && summary.checkoutStartRate < 45) {
    issues.push({
      severity: "high",
      title: "Buy Credits page is losing ready buyers",
      detail: `Only ${summary.checkoutStartRate}% of Buy Credits visitors start checkout. Review package default selection, Stripe trust signals, and any login friction before the purchase button.`,
    });
  }

  if (summary.checkoutStarts >= 3 && summary.checkoutCompletionRate < 60) {
    issues.push({
      severity: "high",
      title: "Checkout starts are not becoming completed purchases",
      detail: `${summary.checkoutStarts} checkout starts produced ${summary.completedPurchases} completed purchases. Check Stripe failures, webhook delays, payment-method friction, and whether users return confused after checkout.`,
    });
  }

  const riskySource = summary.topSources.find(
    (source) => source.sessions >= 5 && source.bounceRate >= Math.max(65, summary.bounceRate + 15),
  );
  if (riskySource) {
    issues.push({
      severity: "medium",
      title: `${riskySource.source} traffic is underperforming`,
      detail: `${riskySource.source} / ${riskySource.medium} has a ${riskySource.bounceRate}% bounce rate. Compare ad or referral messaging against the landing page promise.`,
    });
  }

  const direct = summary.topSources.find((source) => source.source === "direct");
  if (direct && summary.visitors >= 10 && percent(direct.visitors, summary.visitors) >= 60) {
    issues.push({
      severity: "low",
      title: "Attribution is mostly direct traffic",
      detail: `${percent(direct.visitors, summary.visitors)}% of visitors are direct or unattributed. Add UTMs to email, social, partner, and ad links so acquisition decisions are reliable.`,
    });
  }

  if (issues.length === 0) {
    issues.push({
      severity: "low",
      title: "No major purchase blocker detected yet",
      detail: "Keep collecting events. The strongest next signal will come from pricing visits, Buy Credits visits, checkout starts, and completed transaction volume.",
    });
  }

  return issues.slice(0, 5);
}
