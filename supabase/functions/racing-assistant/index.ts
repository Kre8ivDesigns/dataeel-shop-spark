import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { decryptSettingValue } from "../_shared/decrypt_setting.ts";
import {
  completeAnthropic,
  completeOpenAI,
  completeOpenRouter,
  estimateCostUsd,
  type ChatTurn,
} from "./llm_providers.ts";
import { RACING_ASSISTANT_KNOWLEDGE } from "./knowledge.ts";
import { buildSystemPrompt } from "./prompt.ts";

const SITE_CONTENT_KNOWLEDGE_KEY = "racing_assistant_knowledge";

const MAX_USER_MESSAGE_CHARS = 900;
const MAX_HISTORY_MESSAGES = 2;
const MAX_HISTORY_CONTENT_CHARS = 650;

const DEFAULT_PROVIDER = "openrouter";
const DEFAULT_MODEL_OR = "openai/gpt-4o-mini";

type Provider = "openrouter" | "anthropic" | "openai";

function trimMessage(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max);
}

const AI_KEYS = [
  "ai_chat_provider",
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
    for (const row of rows ?? []) {
      try {
        settings[row.key] = await decryptSettingValue(row.encrypted_value, encryptionKey);
      } catch {
        /* skip */
      }
    }

    let provider = (settings.ai_chat_provider || DEFAULT_PROVIDER).trim().toLowerCase() as Provider;
    if (provider !== "openrouter" && provider !== "anthropic" && provider !== "openai") {
      provider = DEFAULT_PROVIDER;
    }

    const orKey = (settings.openrouter_api_key || "").trim();
    const orModel = (settings.openrouter_model || "").trim() || DEFAULT_MODEL_OR;
    const anKey = (settings.anthropic_api_key || "").trim();
    const anModel = (settings.anthropic_model || "").trim() || "claude-3-5-haiku-20241022";
    const oaKey = (settings.openai_api_key || "").trim();
    const oaModel = (settings.openai_model || "").trim() || "gpt-4o-mini";

    let knowledgeBlock = RACING_ASSISTANT_KNOWLEDGE;
    const { data: kbRow, error: kbErr } = await supabaseAdmin
      .from("site_content")
      .select("body")
      .eq("key", SITE_CONTENT_KNOWLEDGE_KEY)
      .maybeSingle();
    if (!kbErr && kbRow?.body?.trim()) {
      knowledgeBlock = kbRow.body.trim();
    }
    const systemPrompt = buildSystemPrompt(knowledgeBlock);

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
      },
    }).then(({ error: logErr }) => {
      if (logErr) console.error("[racing-assistant] audit log:", logErr.message);
    });

    return respond({
      reply: result.text,
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
