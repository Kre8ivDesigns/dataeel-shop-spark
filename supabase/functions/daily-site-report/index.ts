import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptSettingValue } from "../_shared/decrypt_setting.ts";
import { smtpSendMail } from "../_shared/smtp_client.ts";

const RECIPIENTS = ["support@dataeel.com", "info@kre8ivdesigns.com"];
const DEFAULT_SITE_URL = "https://www.thedataeel.com";
const REPORT_PAGES = ["/", "/pricing", "/racecards", "/how-to-read-racecard"];
const TARGET_KEYWORDS = ["race cards", "horse racing", "racecard analysis", "horse racing picks", "daily racecards"];

type SiteEvent = {
  created_at: string;
  event_name: string;
  visitor_id: string;
  session_id: string;
  path: string | null;
  source: string | null;
  medium: string | null;
  device_type: string | null;
  is_new_visitor: boolean | null;
};

type Transaction = {
  created_at: string;
  status: string;
};

type SmtpConfig = {
  smtp_host?: string;
  smtp_port?: string;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from?: string;
  smtp_from_name?: string;
  smtp_reply_to?: string;
};

type AiConfig = {
  ai_chat_provider?: string;
  openrouter_api_key?: string;
  openrouter_model?: string;
  anthropic_api_key?: string;
  anthropic_model?: string;
  openai_api_key?: string;
  openai_model?: string;
};

type PageSeoResult = {
  path: string;
  title: string;
  metaDescriptionLength: number;
  h1Count: number;
  h2Count: number;
  imageCount: number;
  imagesMissingAlt: number;
  wordCount: number;
  missingKeywords: string[];
  pageSpeed: {
    performance: number | null;
    seo: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    lcpMs: number | null;
    inpMs: number | null;
    cls: number | null;
    diagnostics: string[];
  };
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function startOfWindow(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  return match?.[1]?.trim() ?? "";
}

function countTags(html: string, tag: string): number {
  return (html.match(new RegExp(`<${tag}(\\s|>|/)`, "gi")) ?? []).length;
}

function countImagesMissingAlt(html: string): number {
  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  return imageTags.filter((tag) => !/\salt=(["']).+?\1/i.test(tag)).length;
}

function topEntries(map: Map<string, number>, limit: number): { key: string; count: number }[] {
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

async function loadSettings(
  supabaseAdmin: ReturnType<typeof createClient>,
  encryptionKey: string,
  keys: string[],
): Promise<Record<string, string>> {
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("key, encrypted_value")
    .in("key", keys);
  if (error) throw new Error(`Failed to load app settings: ${error.message}`);

  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    try {
      settings[row.key] = await decryptSettingValue(row.encrypted_value, encryptionKey);
    } catch {
      /* Skip undecryptable settings. Missing required settings are validated later. */
    }
  }
  return settings;
}

function requireSmtpConfig(settings: Record<string, string>): SmtpConfig {
  const cfg = settings as SmtpConfig;
  for (const key of ["smtp_host", "smtp_user", "smtp_password", "smtp_from"] as const) {
    if (!cfg[key]?.trim()) throw new Error(`SMTP not configured: ${key} missing`);
  }
  return cfg;
}

async function fetchAnalyticsRows(supabaseAdmin: ReturnType<typeof createClient>) {
  const [eventsRes, txRes] = await Promise.all([
    supabaseAdmin
      .from("site_analytics_events")
      .select("created_at,event_name,visitor_id,session_id,path,source,medium,device_type,is_new_visitor")
      .gte("created_at", startOfWindow(8))
      .limit(10000),
    supabaseAdmin
      .from("transactions")
      .select("created_at,status")
      .gte("created_at", startOfWindow(8)),
  ]);

  if (eventsRes.error) throw new Error(`Failed to load analytics events: ${eventsRes.error.message}`);
  if (txRes.error) throw new Error(`Failed to load transactions: ${txRes.error.message}`);
  return {
    events: (eventsRes.data ?? []) as SiteEvent[],
    transactions: (txRes.data ?? []) as Transaction[],
  };
}

function summarizeEvents(events: SiteEvent[], transactions: Transaction[], sinceIso: string) {
  const rows = events.filter((event) => event.created_at >= sinceIso);
  const visitorIds = new Set(rows.map((row) => row.visitor_id).filter(Boolean));
  const sessionIds = new Set(rows.map((row) => row.session_id).filter(Boolean));
  const pageViews = rows.filter((row) => row.event_name === "page_view");
  const checkoutStarts = rows.filter((row) => row.event_name === "checkout_started").length;
  const completedPurchases = transactions.filter((tx) => tx.status === "completed" && tx.created_at >= sinceIso).length;
  const engagedSessions = new Set(
    rows
      .filter((row) => ["engaged_session_10s", "scroll_depth", "cta_clicked", "checkout_started"].includes(row.event_name))
      .map((row) => row.session_id),
  );

  const sessionPageViews = new Map<string, number>();
  for (const row of pageViews) {
    sessionPageViews.set(row.session_id, (sessionPageViews.get(row.session_id) ?? 0) + 1);
  }
  const bounces = Array.from(sessionIds).filter(
    (sessionId) => (sessionPageViews.get(sessionId) ?? 0) <= 1 && !engagedSessions.has(sessionId),
  ).length;

  const paths = new Map<string, number>();
  const sources = new Map<string, number>();
  const devices = new Map<string, number>();
  const eventsByName = new Map<string, number>();
  for (const row of rows) {
    if (row.path) paths.set(row.path, (paths.get(row.path) ?? 0) + 1);
    const sourceKey = `${row.source || "direct"} / ${row.medium || "none"}`;
    sources.set(sourceKey, (sources.get(sourceKey) ?? 0) + 1);
    devices.set(row.device_type || "unknown", (devices.get(row.device_type || "unknown") ?? 0) + 1);
    eventsByName.set(row.event_name, (eventsByName.get(row.event_name) ?? 0) + 1);
  }

  return {
    visitors: visitorIds.size,
    sessions: sessionIds.size,
    pageViews: pageViews.length,
    bounceRate: pct(bounces, sessionIds.size),
    checkoutStarts,
    completedPurchases,
    checkoutCompletionRate: pct(completedPurchases, checkoutStarts),
    topPages: topEntries(paths, 8),
    topSources: topEntries(sources, 8),
    devices: topEntries(devices, 5),
    topEvents: topEntries(eventsByName, 8),
  };
}

async function fetchPageSpeed(url: string) {
  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
  });
  params.append("category", "seo");
  params.append("category", "accessibility");
  params.append("category", "best-practices");
  const key = Deno.env.get("PAGESPEED_API_KEY")?.trim();
  if (key) params.set("key", key);

  const response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`);
  if (!response.ok) return null;
  const json = await response.json() as {
    loadingExperience?: { metrics?: Record<string, { percentile?: number }> };
    lighthouseResult?: {
      categories?: Record<string, { score?: number | null }>;
      audits?: Record<string, { title?: string; score?: number | null; displayValue?: string }>;
    };
  };
  const categories = json.lighthouseResult?.categories ?? {};
  const audits = json.lighthouseResult?.audits ?? {};
  const metrics = json.loadingExperience?.metrics ?? {};
  const diagnostics = ["largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "render-blocking-resources", "uses-optimized-images"]
    .map((id) => audits[id])
    .filter((audit) => audit && audit.score != null && audit.score < 0.9)
    .map((audit) => `${audit.title ?? "Diagnostic"}${audit.displayValue ? ` (${audit.displayValue})` : ""}`)
    .slice(0, 4);

  return {
    performance: categories.performance?.score == null ? null : Math.round(categories.performance.score * 100),
    seo: categories.seo?.score == null ? null : Math.round(categories.seo.score * 100),
    accessibility: categories.accessibility?.score == null ? null : Math.round(categories.accessibility.score * 100),
    bestPractices: categories["best-practices"]?.score == null ? null : Math.round(categories["best-practices"].score * 100),
    lcpMs: metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
    inpMs: metrics.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
    cls: metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile == null ? null : metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100,
    diagnostics,
  };
}

async function analyzeSeo(siteUrl: string): Promise<PageSeoResult[]> {
  const base = siteUrl.replace(/\/$/, "");
  const results: PageSeoResult[] = [];

  for (const path of REPORT_PAGES) {
    const url = `${base}${path}`;
    try {
      const [htmlResponse, pageSpeed] = await Promise.all([
        fetch(url, { headers: { "User-Agent": "DATAEEL Daily Site Report" } }),
        fetchPageSpeed(url),
      ]);
      const html = htmlResponse.ok ? await htmlResponse.text() : "";
      const text = stripHtml(html);
      const lowerText = text.toLowerCase();
      const imageCount = countTags(html, "img");
      results.push({
        path,
        title: extractTag(html, "title"),
        metaDescriptionLength: extractMetaDescription(html).length,
        h1Count: countTags(html, "h1"),
        h2Count: countTags(html, "h2"),
        imageCount,
        imagesMissingAlt: countImagesMissingAlt(html),
        wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
        missingKeywords: TARGET_KEYWORDS.filter((keyword) => !lowerText.includes(keyword)),
        pageSpeed: pageSpeed ?? {
          performance: null,
          seo: null,
          accessibility: null,
          bestPractices: null,
          lcpMs: null,
          inpMs: null,
          cls: null,
          diagnostics: ["PageSpeed unavailable"],
        },
      });
    } catch (error) {
      results.push({
        path,
        title: "",
        metaDescriptionLength: 0,
        h1Count: 0,
        h2Count: 0,
        imageCount: 0,
        imagesMissingAlt: 0,
        wordCount: 0,
        missingKeywords: TARGET_KEYWORDS,
        pageSpeed: {
          performance: null,
          seo: null,
          accessibility: null,
          bestPractices: null,
          lcpMs: null,
          inpMs: null,
          cls: null,
          diagnostics: [error instanceof Error ? error.message : "SEO fetch failed"],
        },
      });
    }
  }

  return results;
}

function deterministicAnalysis(reportData: unknown): string {
  return [
    "AI analysis unavailable: no configured AI provider completed successfully.",
    "",
    "Fallback reading:",
    "- Review visitor/session volume, top pages, and top sources for what is being seen.",
    "- Treat high bounce rate, low checkout starts, or low checkout completion as the main conversion risks.",
    "- Prioritize pages with weak PageSpeed SEO/performance scores, missing metadata, missing alt text, or thin copy.",
    "",
    JSON.stringify(reportData, null, 2).slice(0, 6000),
  ].join("\n");
}

async function completeAiAnalysis(settings: AiConfig, reportData: unknown): Promise<string> {
  const provider = (settings.ai_chat_provider || "openrouter").trim();
  const system = [
    "You are a senior growth, SEO, and product analytics analyst for DATAEEL.",
    "Write a direct daily email report. Explain what is going well, what is not, what visitors are seeing, likely causes, and concrete next actions.",
    "Do not invent data. If sample size is low, say so. Keep it useful for a business owner and agency team.",
  ].join(" ");
  const prompt = `Analyze this daily DATAEEL site analytics and SEO report JSON:\n${JSON.stringify(reportData, null, 2)}`;

  if (provider === "openai" && settings.openai_api_key?.trim()) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.openai_api_key.trim()}`,
      },
      body: JSON.stringify({
        model: settings.openai_model?.trim() || "gpt-4o-mini",
        temperature: 0.25,
        max_tokens: 1400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) throw new Error(`OpenAI analysis failed: ${response.status}`);
    const json = await response.json() as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() || deterministicAnalysis(reportData);
  }

  if (provider === "anthropic" && settings.anthropic_api_key?.trim()) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.anthropic_api_key.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: settings.anthropic_model?.trim() || "claude-3-5-haiku-latest",
        temperature: 0.25,
        max_tokens: 1400,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) throw new Error(`Anthropic analysis failed: ${response.status}`);
    const json = await response.json() as { content?: { type: string; text?: string }[] };
    return json.content?.find((part) => part.type === "text")?.text?.trim() || deterministicAnalysis(reportData);
  }

  if (settings.openrouter_api_key?.trim()) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.openrouter_api_key.trim()}`,
        "HTTP-Referer": Deno.env.get("SITE_PUBLIC_URL") || DEFAULT_SITE_URL,
        "X-Title": "DATAEEL Daily Site Report",
      },
      body: JSON.stringify({
        model: settings.openrouter_model?.trim() || "openai/gpt-4o-mini",
        temperature: 0.25,
        max_tokens: 1400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) throw new Error(`OpenRouter analysis failed: ${response.status}`);
    const json = await response.json() as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() || deterministicAnalysis(reportData);
  }

  return deterministicAnalysis(reportData);
}

function formatNumber(value: number | null): string {
  return value == null ? "n/a" : String(value);
}

function buildEmailBody(reportData: {
  generatedAt: string;
  siteUrl: string;
  last24h: ReturnType<typeof summarizeEvents>;
  last7d: ReturnType<typeof summarizeEvents>;
  seo: PageSeoResult[];
}, analysis: string): string {
  const seoLines = reportData.seo.map((page) => [
    `${page.path}: Performance ${formatNumber(page.pageSpeed.performance)}, SEO ${formatNumber(page.pageSpeed.seo)}, Accessibility ${formatNumber(page.pageSpeed.accessibility)}, Best Practices ${formatNumber(page.pageSpeed.bestPractices)}`,
    `  Title: ${page.title || "missing"} | H1: ${page.h1Count} | H2: ${page.h2Count} | Words: ${page.wordCount} | Images missing alt: ${page.imagesMissingAlt}/${page.imageCount}`,
    `  Missing target keywords: ${page.missingKeywords.length ? page.missingKeywords.join(", ") : "none"}`,
    `  Diagnostics: ${page.pageSpeed.diagnostics.length ? page.pageSpeed.diagnostics.join("; ") : "none flagged"}`,
  ].join("\n"));

  return [
    `DATAEEL Daily Site Analytics + SEO Report`,
    `Generated: ${reportData.generatedAt}`,
    `Site: ${reportData.siteUrl}`,
    "",
    "AI ANALYSIS",
    analysis,
    "",
    "LAST 24 HOURS",
    JSON.stringify(reportData.last24h, null, 2),
    "",
    "LAST 7 DAYS",
    JSON.stringify(reportData.last7d, null, 2),
    "",
    "SEO + PAGE EXPERIENCE",
    seoLines.join("\n\n"),
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  const authHeader = req.headers.get("Authorization");
  const cronHeader = req.headers.get("x-cron-secret");
  if (!cronSecret || (authHeader !== `Bearer ${cronSecret}` && cronHeader !== cronSecret)) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    const encryptionKey = Deno.env.get("APP_SETTINGS_ENCRYPTION_KEY")?.trim();
    if (!supabaseUrl || !serviceRole || !encryptionKey || encryptionKey.length < 64) {
      return jsonResponse(500, { error: "Server misconfigured" });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRole);
    const settings = await loadSettings(supabaseAdmin, encryptionKey, [
      "smtp_host",
      "smtp_port",
      "smtp_user",
      "smtp_password",
      "smtp_from",
      "smtp_from_name",
      "smtp_reply_to",
      "ai_chat_provider",
      "openrouter_api_key",
      "openrouter_model",
      "anthropic_api_key",
      "anthropic_model",
      "openai_api_key",
      "openai_model",
    ]);
    const smtp = requireSmtpConfig(settings);
    const { events, transactions } = await fetchAnalyticsRows(supabaseAdmin);
    const siteUrl = Deno.env.get("SITE_PUBLIC_URL")?.trim() || DEFAULT_SITE_URL;
    const reportData = {
      generatedAt: new Date().toISOString(),
      siteUrl,
      last24h: summarizeEvents(events, transactions, startOfWindow(1)),
      last7d: summarizeEvents(events, transactions, startOfWindow(7)),
      seo: await analyzeSeo(siteUrl),
    };

    let analysis: string;
    try {
      analysis = await completeAiAnalysis(settings as AiConfig, reportData);
    } catch (error) {
      console.error("[daily-site-report] AI analysis failed", error instanceof Error ? error.message : error);
      analysis = deterministicAnalysis(reportData);
    }

    const subjectDate = new Date().toISOString().slice(0, 10);
    const textBody = buildEmailBody(reportData, analysis);
    const failures: { to: string; error: string }[] = [];
    for (const to of RECIPIENTS) {
      try {
        await smtpSendMail({
          host: smtp.smtp_host!,
          port: parseInt(smtp.smtp_port || "587", 10),
          user: smtp.smtp_user!,
          password: smtp.smtp_password!,
          fromAddress: smtp.smtp_from!,
          fromName: smtp.smtp_from_name || "DATAEEL",
          replyTo: smtp.smtp_reply_to || "",
          to,
          subject: `DATAEEL daily analytics + SEO report - ${subjectDate}`,
          textBody,
        });
      } catch (error) {
        failures.push({ to, error: error instanceof Error ? error.message : "SMTP send failed" });
      }
    }

    await supabaseAdmin.from("audit_log").insert({
      actor_id: null,
      action: "daily_site_report.sent",
      resource: "site_analytics_events",
      resource_id: null,
      detail: {
        recipients: RECIPIENTS,
        failed: failures.length,
        visitors_24h: reportData.last24h.visitors,
        sessions_24h: reportData.last24h.sessions,
      },
    });

    return jsonResponse(failures.length ? 207 : 200, {
      ok: failures.length === 0,
      sent: RECIPIENTS.length - failures.length,
      failed: failures.length,
      failures,
    });
  } catch (error) {
    console.error("[daily-site-report]", error instanceof Error ? error.message : error);
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Internal server error" });
  }
});
