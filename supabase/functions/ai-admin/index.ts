import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { decryptSettingValue } from "../_shared/decrypt_setting.ts";
import {
  completeAnthropic,
  completeOpenAI,
  completeOpenRouter,
  resolveOpenRouterModelsFromEnv,
} from "../racing-assistant/llm_providers.ts";

type Provider = "openrouter" | "anthropic" | "openai";

const DEFAULT_PROVIDER: Provider = "openrouter";

function getOpenRouterKeyFromEnv(): string {
  return (Deno.env.get("OPENROUTER_API_KEY") || "").trim();
}

function hasProviderApiKey(settings: Record<string, string>, p: Provider): boolean {
  if (p === "openrouter") {
    return !!getOpenRouterKeyFromEnv() || !!(settings.openrouter_api_key || "").trim();
  }
  if (p === "anthropic") return !!(settings.anthropic_api_key || "").trim();
  return !!(settings.openai_api_key || "").trim();
}

/** Prefer admin-selected provider; fall back to the first provider with a usable key. */
function resolveChatProvider(settings: Record<string, string>): Provider {
  let p = (settings.ai_chat_provider || DEFAULT_PROVIDER).trim().toLowerCase() as Provider;
  if (p !== "openrouter" && p !== "anthropic" && p !== "openai") p = DEFAULT_PROVIDER;
  if (hasProviderApiKey(settings, p)) return p;
  for (const c of ["anthropic", "openai", "openrouter"] as Provider[]) {
    if (hasProviderApiKey(settings, c)) return c;
  }
  return p;
}

const FUNNEL_ANALYST_SYSTEM_PROMPT =
  "You are a growth advisor with 30 years of combined, hands-on experience as an SEO strategist, " +
  "UI/UX designer, and product manager, now acting as the lead growth expert for a paid horse-racing " +
  "racecard product (visitors browse free racecards, register an account, buy credits, and spend a " +
  "credit to download a racecard). You are given first-party funnel analytics. Give a sharp, specific, " +
  "executive-level analysis of WHY the site may be failing to retain visitors, convert registrations, " +
  "or drive purchases. Be concrete and prioritized — no generic filler. Structure your answer as: " +
  "1) Headline verdict (2-3 sentences naming the single biggest blocker). " +
  "2) Retention, 3) Registration, 4) Purchasing — each with the likely root cause tied to the numbers " +
  "and 2-3 concrete, testable fixes ranked by expected impact. " +
  "5) The top 3 experiments to run next, highest ROI first. " +
  "Reference the actual metrics provided. Use short markdown headings and bullet points. " +
  "If the data volume is too small to be reliable, say so plainly and explain what to collect.";

const AI_KEYS = [
  "ai_chat_provider",
  "openrouter_api_key",
  "openrouter_model",
  "anthropic_api_key",
  "anthropic_model",
  "openai_api_key",
  "openai_model",
] as const;

async function loadAiSettings(
  supabaseAdmin: ReturnType<typeof createClient>,
  encryptionKey: string,
): Promise<Record<string, string>> {
  const { data: rows } = await supabaseAdmin
    .from("app_settings")
    .select("key, encrypted_value")
    .in("key", [...AI_KEYS]);

  const settings: Record<string, string> = {};
  for (const row of rows ?? []) {
    try {
      settings[row.key] = await decryptSettingValue(row.encrypted_value, encryptionKey);
    } catch {
      /* skip */
    }
  }
  return settings;
}

async function fetchOpenRouterModels(apiKey: string) {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`OpenRouter models ${res.status}`);
  const json = (await res.json()) as {
    data?: { id: string; name?: string; pricing?: { prompt?: string; completion?: string } }[];
  };
  const list = (json.data ?? [])
    .map((m) => ({
      id: m.id,
      label: m.name || m.id,
      pricing: m.pricing
        ? { prompt: m.pricing.prompt ?? null, completion: m.pricing.completion ?? null }
        : null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return list.slice(0, 500);
}

async function fetchOpenAiModels(apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`OpenAI models ${res.status}`);
  const json = (await res.json()) as { data?: { id: string }[] };
  const raw = json.data ?? [];
  const filtered = raw
    .map((m) => m.id)
    .filter(
      (id) =>
        id.includes("gpt") ||
        id.startsWith("o1") ||
        id.startsWith("o3") ||
        id.startsWith("o4") ||
        id === "gpt-4-turbo" ||
        id.startsWith("chatgpt-"),
    )
    .sort();
  return filtered.slice(0, 200).map((id) => ({ id, label: id, pricing: null }));
}

async function fetchAnthropicModels(apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic models ${res.status}: ${t.slice(0, 120)}`);
  }
  const json = (await res.json()) as { data?: { id: string; display_name?: string }[] };
  const list = (json.data ?? [])
    .map((m) => ({ id: m.id, label: m.display_name || m.id, pricing: null }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return list.slice(0, 100);
}

async function testProvider(provider: Provider, apiKey: string): Promise<{ ok: boolean; detail: string; modelCount?: number }> {
  const key = apiKey.trim();
  if (!key) return { ok: false, detail: "No API key stored" };
  try {
    if (provider === "openrouter") {
      const models = await fetchOpenRouterModels(key);
      return { ok: true, detail: "Connected", modelCount: models.length };
    }
    if (provider === "anthropic") {
      const models = await fetchAnthropicModels(key);
      return { ok: true, detail: "Connected", modelCount: models.length };
    }
    const models = await fetchOpenAiModels(key);
    return { ok: true, detail: "Connected", modelCount: models.length };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "Failed" };
  }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const encryptionKey = Deno.env.get("APP_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey || encryptionKey.length < 64) {
      return respond({ error: "Server misconfigured" }, 500);
    }

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

    const body = await req.json() as { action?: string; provider?: string; days?: number };
    const action = body.action;

    if (action === "list_models") {
      const p = body.provider as Provider;
      if (p !== "openrouter" && p !== "anthropic" && p !== "openai") {
        return respond({ error: "Invalid provider" }, 400);
      }
      const settings = await loadAiSettings(supabaseAdmin, encryptionKey);
      const key =
        p === "openrouter"
          ? settings.openrouter_api_key
          : p === "anthropic"
            ? settings.anthropic_api_key
            : settings.openai_api_key;
      if (!key?.trim()) return respond({ error: "Save an API key for this provider first" }, 400);
      try {
        if (p === "openrouter") return respond({ models: await fetchOpenRouterModels(key.trim()) });
        if (p === "anthropic") return respond({ models: await fetchAnthropicModels(key.trim()) });
        return respond({ models: await fetchOpenAiModels(key.trim()) });
      } catch (e) {
        return respond({ error: e instanceof Error ? e.message : "List failed" });
      }
    }

    if (action === "test_connection") {
      const p = body.provider as Provider;
      if (p !== "openrouter" && p !== "anthropic" && p !== "openai") {
        return respond({ error: "Invalid provider" }, 400);
      }
      const settings = await loadAiSettings(supabaseAdmin, encryptionKey);
      const key =
        p === "openrouter"
          ? settings.openrouter_api_key
          : p === "anthropic"
            ? settings.anthropic_api_key
            : settings.openai_api_key;
      const r = await testProvider(p, key || "");
      return respond(r);
    }

    if (action === "usage_stats") {
      const days = typeof body.days === "number" && body.days > 0 && body.days <= 90 ? body.days : 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data: rows, error } = await supabaseAdmin
        .from("audit_log")
        .select("created_at, detail")
        .eq("action", "racing_assistant.query")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);

      if (error) return respond({ error: error.message }, 500);

      let requests = 0;
      let total_prompt = 0;
      let total_completion = 0;
      let total_tokens = 0;
      let estimated_cost_usd = 0;
      const by_provider: Record<string, { requests: number; tokens: number; cost: number }> = {};

      for (const row of rows ?? []) {
        const d = row.detail as Record<string, unknown> | null;
        if (!d) continue;
        requests += 1;
        const pt = typeof d.prompt_tokens === "number" ? d.prompt_tokens : 0;
        const ct = typeof d.completion_tokens === "number" ? d.completion_tokens : 0;
        const tt = typeof d.total_tokens === "number" ? d.total_tokens : pt + ct;
        const cost = typeof d.estimated_cost_usd === "number" ? d.estimated_cost_usd : 0;
        total_prompt += pt;
        total_completion += ct;
        total_tokens += tt;
        estimated_cost_usd += cost;
        const prov = typeof d.provider === "string" ? d.provider : "unknown";
        if (!by_provider[prov]) by_provider[prov] = { requests: 0, tokens: 0, cost: 0 };
        by_provider[prov].requests += 1;
        by_provider[prov].tokens += tt;
        by_provider[prov].cost += cost;
      }

      return respond({
        days,
        requests,
        total_prompt_tokens: total_prompt,
        total_completion_tokens: total_completion,
        total_tokens,
        estimated_cost_usd: Math.round(estimated_cost_usd * 1e6) / 1e6,
        by_provider,
      });
    }

    if (action === "analyze_funnel") {
      const metrics = (body as { metrics?: unknown }).metrics;
      if (!metrics || typeof metrics !== "object") {
        return respond({ error: "Missing metrics payload" }, 400);
      }

      const settings = await loadAiSettings(supabaseAdmin, encryptionKey);
      const provider = resolveChatProvider(settings);
      if (!hasProviderApiKey(settings, provider)) {
        return respond(
          { error: "No AI provider is configured. Add an API key in Admin → Settings → AI." },
        );
      }

      const rangeDays = typeof body.days === "number" && body.days > 0 ? body.days : 90;
      const userMessage =
        `Date range analyzed: last ${rangeDays} days.\n\n` +
        `First-party funnel metrics (JSON):\n${JSON.stringify(metrics, null, 2)}\n\n` +
        "Analyze why this site may be underperforming on retention, registration, and purchasing, " +
        "and give prioritized, testable recommendations.";

      try {
        let text = "";
        let model = "";
        if (provider === "anthropic") {
          const anModel = (settings.anthropic_model || "").trim() || "claude-3-5-haiku-20241022";
          const r = await completeAnthropic(
            (settings.anthropic_api_key || "").trim(),
            anModel,
            [],
            userMessage,
            FUNNEL_ANALYST_SYSTEM_PROMPT,
          );
          text = r.text;
          model = r.model;
        } else if (provider === "openai") {
          const oaModel = (settings.openai_model || "").trim() || "gpt-4o-mini";
          const r = await completeOpenAI(
            (settings.openai_api_key || "").trim(),
            oaModel,
            [],
            userMessage,
            FUNNEL_ANALYST_SYSTEM_PROMPT,
          );
          text = r.text;
          model = r.model;
        } else {
          const orKey = getOpenRouterKeyFromEnv() || (settings.openrouter_api_key || "").trim();
          const orModels = resolveOpenRouterModelsFromEnv((settings.openrouter_model || "").trim());
          const r = await completeOpenRouter(
            orKey,
            orModels,
            [],
            userMessage,
            FUNNEL_ANALYST_SYSTEM_PROMPT,
          );
          text = r.text;
          model = r.model;
        }

        if (!text.trim()) return respond({ error: "Empty response from model", provider, model });
        return respond({ analysis: text, provider, model });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Provider error";
        console.error("[ai-admin] analyze_funnel:", msg);
        return respond({ error: msg.slice(0, 280), provider });
      }
    }

    return respond({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("[ai-admin]", e instanceof Error ? e.message : e);
    return respond({ error: "Internal error" }, 500);
  }
});
