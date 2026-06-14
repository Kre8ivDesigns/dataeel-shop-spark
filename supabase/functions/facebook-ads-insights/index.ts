import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── Facebook (Meta) Marketing API: daily ad-account insights ─────────────────
//
// Required Edge Function secrets (Dashboard → Project Settings → Edge Functions
// → Secrets):
//   META_ACCESS_TOKEN     A long-lived System User token with `ads_read` scope.
//   META_AD_ACCOUNT_ID    Your ad account id, e.g. "act_1234567890".
// Optional:
//   META_GRAPH_VERSION    Defaults to "v21.0".
//
// The token is a secret and must never reach the frontend — this function is the
// only thing that touches Meta. It is admin-gated and caches results into the
// public.fb_ads_insights table so the analytics page reads cheaply.

const GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") || "v21.0";
const PURCHASE_ACTION_TYPES = new Set([
  "purchase",
  "omni_purchase",
  "offsite_conversion.fb_pixel_purchase",
  "onsite_web_purchase",
  "web_in_store_purchase",
]);

type MetaAction = { action_type?: string; value?: string };

type MetaInsightRow = {
  date_start: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  ctr?: string;
  cpc?: string;
  account_currency?: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
};

type ParsedRow = {
  date: string;
  account_id: string;
  account_currency: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  purchases: number;
  purchase_value: number;
};

function num(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sumPurchaseActions(actions: MetaAction[] | undefined): number {
  if (!actions) return 0;
  return actions
    .filter((a) => a.action_type && PURCHASE_ACTION_TYPES.has(a.action_type))
    .reduce((total, a) => total + num(a.value), 0);
}

function parseRow(row: MetaInsightRow, accountId: string): ParsedRow {
  return {
    date: row.date_start,
    account_id: accountId,
    account_currency: row.account_currency ?? null,
    spend: num(row.spend),
    impressions: num(row.impressions),
    clicks: num(row.clicks),
    reach: num(row.reach),
    ctr: num(row.ctr),
    cpc: num(row.cpc),
    purchases: Math.round(sumPurchaseActions(row.actions)),
    purchase_value: sumPurchaseActions(row.action_values),
  };
}

async function fetchInsights(
  accountId: string,
  token: string,
  since: string,
  until: string,
): Promise<MetaInsightRow[]> {
  const fields = "spend,impressions,clicks,reach,ctr,cpc,account_currency,actions,action_values";
  const params = new URLSearchParams({
    fields,
    level: "account",
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    limit: "500",
    access_token: token,
  });

  let url: string | null =
    `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/insights?${params.toString()}`;
  const rows: MetaInsightRow[] = [];

  // Follow cursor pagination, capped so a misbehaving response can't loop forever.
  for (let page = 0; page < 24 && url; page += 1) {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) {
      const message = json?.error?.message ?? `Meta API returned ${res.status}`;
      throw new Error(message);
    }
    if (Array.isArray(json.data)) rows.push(...json.data);
    url = json?.paging?.next ?? null;
  }

  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) return respond({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return respond({ error: "Forbidden" }, 403);

    const token = Deno.env.get("META_ACCESS_TOKEN");
    const accountId = Deno.env.get("META_AD_ACCOUNT_ID");
    if (!token || !accountId) {
      // Not an error: lets the UI render a friendly "connect Facebook Ads" state.
      return respond({ configured: false, rows: [] });
    }

    const body = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(parseInt(String(body?.days ?? "90"), 10) || 90, 1), 365);

    const until = new Date();
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));

    const insightRows = await fetchInsights(accountId, token, isoDate(since), isoDate(until));
    const parsed = insightRows
      .map((row) => parseRow(row, accountId))
      .filter((row) => Boolean(row.date))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (parsed.length > 0) {
      const { error: upsertErr } = await supabaseAdmin
        .from("fb_ads_insights")
        .upsert(
          parsed.map((row) => ({ ...row, raw: {}, updated_at: new Date().toISOString() })),
          { onConflict: "date" },
        );
      if (upsertErr && Deno.env.get("DENO_DEPLOYMENT_ID") === undefined) {
        console.warn("[facebook-ads-insights] cache upsert failed", upsertErr.message);
      }
    }

    return respond({ configured: true, rows: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load Facebook Ads insights";
    return respond({ configured: true, error: message, rows: [] }, 502);
  }
});
