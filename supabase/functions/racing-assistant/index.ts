import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  estimateMaxSingleTurnCostUsd,
  roughPromptTokenEstimate,
} from "../_shared/ai_cost_estimate.ts";
import { decryptSettingValue } from "../_shared/decrypt_setting.ts";
import {
  hashQuestionSha256,
  normalizeQuestionForCache,
  paragraphsToChunks,
  selectKnowledgeChunks,
} from "../_shared/racing_rag.ts";
import {
  completeAnthropic,
  completeOpenAI,
  completeOpenRouter,
  estimateCostUsd,
  type ChatTurn,
} from "./llm_providers.ts";
import { GUARD_CHUNK, KNOWLEDGE_CHUNKS } from "./knowledge_library.ts";
import { RACING_ASSISTANT_KNOWLEDGE } from "./knowledge.ts";
import { buildSystemPrompt } from "./prompt.ts";

const SITE_CONTENT_KNOWLEDGE_KEY = "racing_assistant_knowledge";

/** Max chars for retrieved knowledge excerpts + guard (prompt token budget). */
const MAX_RETRIEVED_KNOWLEDGE_CHARS = 3800;

const MAX_USER_MESSAGE_CHARS = 900;
const MAX_HISTORY_MESSAGES = 2;
const MAX_HISTORY_CONTENT_CHARS = 650;

const DEFAULT_PROVIDER = "openrouter";
const DEFAULT_MODEL_OR = "openai/gpt-4o-mini";

/** Default daily spend cap (USD per user, UTC calendar day) when `ai_daily_cost_cap_usd` is unset. */
const DEFAULT_AI_DAILY_CAP_USD = 5;

function parseDailyCapUsd(raw: string | undefined): number {
  const t = (raw ?? "").trim();
  if (!t) return DEFAULT_AI_DAILY_CAP_USD;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_AI_DAILY_CAP_USD;
  return n;
}

type Provider = "openrouter" | "anthropic" | "openai";

function hasProviderApiKey(settings: Record<string, string>, p: Provider): boolean {
  if (p === "openrouter") return !!(settings.openrouter_api_key || "").trim();
  if (p === "anthropic") return !!(settings.anthropic_api_key || "").trim();
  return !!(settings.openai_api_key || "").trim();
}

/** Prefer admin-selected provider; if that key is missing, use the first provider that has a stored key (fixes OpenRouter default + Anthropic-only keys). */
function resolveChatProvider(settings: Record<string, string>): Provider {
  let p = (settings.ai_chat_provider || DEFAULT_PROVIDER).trim().toLowerCase() as Provider;
  if (p !== "openrouter" && p !== "anthropic" && p !== "openai") {
    p = DEFAULT_PROVIDER;
  }
  if (hasProviderApiKey(settings, p)) return p;

  const order: Provider[] = ["anthropic", "openai", "openrouter"];
  for (const c of order) {
    if (hasProviderApiKey(settings, c)) {
      console.warn(
        `[racing-assistant] ai_chat_provider="${settings.ai_chat_provider || DEFAULT_PROVIDER}" has no usable API key; using ${c}. Set Admin → AI providers → Chat provider to match.`,
      );
      return c;
    }
  }
  return p;
}

function trimMessage(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max);
}

const AI_KEYS = [
  "ai_chat_provider",
  "ai_daily_cost_cap_usd",
  "openrouter_api_key",
  "openrouter_model",
  "anthropic_api_key",
  "anthropic_model",
  "openai_api_key",
  "openai_model",
] as const;

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const encryptionKey = Deno.env.get("APP_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey || encryptionKey.length < 64) {
      return respond({ error: "Assistant not configured (settings encryption)" }, 503);
    }

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

    const body = await req.json() as { message?: string; history?: ChatTurn[] };
    const rawMessage = typeof body.message === "string" ? body.message : "";
    const message = trimMessage(rawMessage, MAX_USER_MESSAGE_CHARS);
    if (!message) return respond({ error: "message is required" }, 400);

    const normalizedQuestion = normalizeQuestionForCache(message);
    const questionHash = await hashQuestionSha256(normalizedQuestion);

    const { data: cachedAnswer, error: cacheReadErr } = await supabaseAdmin
      .from("ai_chat_answer_cache")
      .select("answer_text, hit_count")
      .eq("question_hash", questionHash)
      .maybeSingle();

    if (cacheReadErr) {
      console.error("[racing-assistant] ai_chat_answer_cache read:", cacheReadErr.message);
    } else if (cachedAnswer?.answer_text) {
      const previousHits = Number(cachedAnswer.hit_count ?? 0);
      await supabaseAdmin
        .from("ai_chat_answer_cache")
        .update({
          hit_count: previousHits + 1,
          last_hit_at: new Date().toISOString(),
        })
        .eq("question_hash", questionHash);

      supabaseAdmin.from("audit_log").insert({
        actor_id: user.id,
        action: "racing_assistant.cache_hit",
        resource: "cache",
        resource_id: questionHash.slice(0, 16),
        detail: {
          hits: previousHits + 1,
        },
      }).then(({ error: logErr }) => {
        if (logErr) console.error("[racing-assistant] audit cache_hit:", logErr.message);
      });

      return respond({
        reply: cachedAnswer.answer_text,
        cached: true,
        model: "cache",
        provider: "cache",
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          estimated_cost_usd: 0,
        },
      });
    }

    let history: ChatTurn[] = Array.isArray(body.history) ? body.history : [];
    history = history
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({
        role: m.role,
        content: trimMessage(m.content, MAX_HISTORY_CONTENT_CHARS),
      }));

    const { data: rows, error: settingsErr } = await supabaseAdmin
      .from("app_settings")
      .select("key, encrypted_value")
      .in("key", [...AI_KEYS]);

    if (settingsErr) return respond({ error: "Could not load AI settings" }, 500);

    const settings: Record<string, string> = {};
    let decryptFailures = 0;
    for (const row of rows ?? []) {
      try {
        settings[row.key] = await decryptSettingValue(row.encrypted_value, encryptionKey);
      } catch (e) {
        decryptFailures += 1;
        console.error(
          "[racing-assistant] decrypt failed for app_settings key:",
          row.key,
          e instanceof Error ? e.message : e,
        );
      }
    }
    if (decryptFailures > 0) {
      console.error(
        `[racing-assistant] ${decryptFailures} setting row(s) failed to decrypt — check APP_SETTINGS_ENCRYPTION_KEY matches manage-app-settings`,
      );
    }

    const provider = resolveChatProvider(settings);

    const orKey = (settings.openrouter_api_key || "").trim();
    const orModel = (settings.openrouter_model || "").trim() || DEFAULT_MODEL_OR;
    const anKey = (settings.anthropic_api_key || "").trim();
    const anModel = (settings.anthropic_model || "").trim() || "claude-3-5-haiku-20241022";
    const oaKey = (settings.openai_api_key || "").trim();
    const oaModel = (settings.openai_model || "").trim() || "gpt-4o-mini";

    let chunkList = [...KNOWLEDGE_CHUNKS];
    const { data: kbRow, error: kbErr } = await supabaseAdmin
      .from("site_content")
      .select("body")
      .eq("key", SITE_CONTENT_KNOWLEDGE_KEY)
      .maybeSingle();
    if (!kbErr && kbRow?.body?.trim()) {
      chunkList = [...chunkList, ...paragraphsToChunks(kbRow.body.trim(), "admin")];
    }
    let retrievedKnowledge = selectKnowledgeChunks(
      message,
      chunkList,
      GUARD_CHUNK,
      MAX_RETRIEVED_KNOWLEDGE_CHARS,
    );
    if (retrievedKnowledge.length < 200) {
      retrievedKnowledge = `${RACING_ASSISTANT_KNOWLEDGE}\n\n---\n${retrievedKnowledge}`;
    }
    const systemPrompt = buildSystemPrompt(retrievedKnowledge);

    const usageDateUtc = new Date().toISOString().slice(0, 10);
    const dailyCapUsd = parseDailyCapUsd(settings.ai_daily_cost_cap_usd);
    const modelForEstimate =
      provider === "openrouter" ? orModel : provider === "anthropic" ? anModel : oaModel;
    const promptEst = roughPromptTokenEstimate(systemPrompt, history, message);
    const maxEstUsd = estimateMaxSingleTurnCostUsd(provider, modelForEstimate, promptEst);

    const { data: usageRow, error: usageFetchErr } = await supabaseAdmin
      .from("ai_usage_daily")
      .select("spend_usd")
      .eq("user_id", user.id)
      .eq("usage_date", usageDateUtc)
      .maybeSingle();

    if (usageFetchErr) {
      console.error("[racing-assistant] ai_usage_daily read:", usageFetchErr.message);
      return respond({ error: "Could not verify AI usage limits" }, 500);
    }

    const spentTodayUsd = Number(usageRow?.spend_usd ?? 0);
    if (spentTodayUsd + maxEstUsd > dailyCapUsd + 1e-9) {
      return respond(
        {
          error:
            `Daily AI assistant limit reached (about $${dailyCapUsd.toFixed(2)} per day in estimated usage). Try again tomorrow.`,
          code: "ai_daily_cap_exceeded",
          daily_cap_usd: dailyCapUsd,
          spent_usd_today: spentTodayUsd,
        },
        429,
      );
    }

    let result: Awaited<ReturnType<typeof completeOpenRouter>>;

    try {
      if (provider === "openrouter") {
        if (!orKey) {
          return respond({ error: "OpenRouter API key not configured (Admin → Settings → AI)." }, 503);
        }
        result = await completeOpenRouter(orKey, orModel, history, message, systemPrompt);
      } else if (provider === "anthropic") {
        if (!anKey) {
          return respond({ error: "Anthropic API key not configured (Admin → Settings → AI)." }, 503);
        }
        result = await completeAnthropic(anKey, anModel, history, message, systemPrompt);
      } else {
        if (!oaKey) {
          return respond({ error: "OpenAI API key not configured (Admin → Settings → AI)." }, 503);
        }
        result = await completeOpenAI(oaKey, oaModel, history, message, systemPrompt);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Provider error";
      console.error("[racing-assistant]", msg);
      return respond({ error: msg.slice(0, 280) }, 502);
    }

    if (!result.text) return respond({ error: "Empty response from model" }, 502);

    const { error: cacheUpsertErr } = await supabaseAdmin.from("ai_chat_answer_cache").upsert(
      {
        question_hash: questionHash,
        answer_text: result.text,
        hit_count: 1,
        last_hit_at: new Date().toISOString(),
      },
      { onConflict: "question_hash", ignoreDuplicates: true },
    );
    if (cacheUpsertErr) {
      console.error("[racing-assistant] ai_chat_answer_cache upsert:", cacheUpsertErr.message);
    }

    const estimated_cost_usd = estimateCostUsd(
      result.provider,
      result.model,
      result.usage.prompt_tokens,
      result.usage.completion_tokens,
      result.usage.cost_usd,
    );

    supabaseAdmin.from("audit_log").insert({
      actor_id: user.id,
      action: "racing_assistant.query",
      resource: result.provider,
      resource_id: null,
      detail: {
        provider: result.provider,
        model: result.model,
        user_message_len: message.length,
        history_len: history.length,
        prompt_tokens: result.usage.prompt_tokens,
        completion_tokens: result.usage.completion_tokens,
        total_tokens: result.usage.total_tokens,
        estimated_cost_usd,
        native_cost_usd: result.usage.cost_usd ?? null,
        usage_date_utc: usageDateUtc,
      },
    }).then(({ error: logErr }) => {
      if (logErr) console.error("[racing-assistant] audit log:", logErr.message);
    });

    const { error: usageIncErr } = await supabaseAdmin.rpc("increment_ai_usage_daily", {
      p_user_id: user.id,
      p_usage_date: usageDateUtc,
      p_delta_usd: estimated_cost_usd,
    });
    if (usageIncErr) {
      console.error("[racing-assistant] increment_ai_usage_daily:", usageIncErr.message);
    }

    return respond({
      reply: result.text,
      cached: false,
      model: result.model,
      provider: result.provider,
      usage: {
        ...result.usage,
        estimated_cost_usd,
      },
    });
  } catch (e) {
    console.error("[racing-assistant]", e instanceof Error ? e.message : e);
    return respond({ error: "Internal error" }, 500);
  }
});
