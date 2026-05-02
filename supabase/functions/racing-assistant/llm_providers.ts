import {
  estimateCostUsd as estimateCostUsdShared,
  RACING_ASSISTANT_MAX_COMPLETION_TOKENS,
  type ChatTurn,
} from "../_shared/ai_cost_estimate.ts";
import {
  buildOpenRouterModelChain,
  isOpenRouterRetryableStatus,
} from "./openrouter_chain.ts";

export type { ChatTurn };

export type LlmResult = {
  text: string;
  model: string;
  provider: LlmProviderTag;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    /** From OpenRouter when present */
    cost_usd?: number | null;
  };
};

const MAX_OUT = RACING_ASSISTANT_MAX_COMPLETION_TOKENS;

export function estimateCostUsd(
  provider: LlmResult["provider"],
  model: string,
  promptTokens: number,
  completionTokens: number,
  nativeCost?: number | null,
): number {
  return estimateCostUsdShared(provider, model, promptTokens, completionTokens, nativeCost);
}

function messagesToOpenAiFormat(system: string, history: ChatTurn[], userMessage: string) {
  return [
    { role: "system", content: system },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];
}

/** OpenAI-compatible `response_format` for OpenRouter structured outputs. */
export type OpenRouterResponseFormat =
  | { type: "json_object" }
  | {
    type: "json_schema";
    json_schema: {
      name: string;
      strict?: boolean;
      schema: Record<string, unknown>;
    };
  };

export type OpenRouterCompletionOptions = {
  responseFormat?: OpenRouterResponseFormat;
};

function openRouterRequestHeaders(apiKey: string): HeadersInit {
  const referer = Deno.env.get("SITE_PUBLIC_URL") || "https://dataeel.com";
  const title = Deno.env.get("OPENROUTER_APP_TITLE")?.trim() || "DATAEEL Racing Assistant";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": referer,
    "X-Title": title,
  };
}

function messageContentToText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const part of content) {
      if (typeof part === "object" && part !== null && "text" in part) {
        const t = (part as { text?: unknown }).text;
        if (typeof t === "string") parts.push(t);
      }
    }
    return parts.join("").trim();
  }
  return "";
}

/**
 * Build the OpenRouter model list (free-tier defaults, env/admin overrides).
 * Call from the Edge Function after reading `Deno.env` and admin settings.
 */
export function resolveOpenRouterModelsFromEnv(adminOpenRouterModel: string): string[] {
  return buildOpenRouterModelChain({
    envPrimary: Deno.env.get("OPENROUTER_MODEL"),
    envFallbacksCsv: Deno.env.get("OPENROUTER_MODEL_FALLBACKS") ?? undefined,
    adminModel: adminOpenRouterModel,
  });
}

/**
 * OpenRouter chat completions with **free-models-first** chain and retry on 429 / 5xx only.
 * Optional `responseFormat` for JSON mode / json_schema (model-dependent).
 */
export async function completeOpenRouter(
  apiKey: string,
  models: string[],
  history: ChatTurn[],
  userMessage: string,
  systemPrompt: string,
  options?: OpenRouterCompletionOptions,
): Promise<LlmResult> {
  if (!models.length) {
    throw new Error("OpenRouter: no models in chain");
  }
  const messages = messagesToOpenAiFormat(systemPrompt, history, userMessage);
  let lastError = "";

  for (const model of models) {
    const payload: Record<string, unknown> = {
      model,
      max_tokens: MAX_OUT,
      temperature: 0.35,
      messages,
    };
    if (options?.responseFormat) {
      payload.response_format = options.responseFormat;
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: openRouterRequestHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    const bodyText = await res.text();

    if (!res.ok) {
      lastError = `OpenRouter ${res.status}: ${bodyText.slice(0, 200)}`;
      if (isOpenRouterRetryableStatus(res.status)) {
        console.warn(`[completeOpenRouter] model=${model} status=${res.status} — trying fallback`);
        continue;
      }
      throw new Error(lastError);
    }

    type OrChatJson = {
      choices?: { message?: { content?: unknown } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        cost?: number;
        total_cost?: number;
        native_tokens_cost?: number;
      };
    };
    let json: OrChatJson;
    try {
      json = JSON.parse(bodyText) as OrChatJson;
    } catch {
      throw new Error(`OpenRouter: invalid JSON response for model ${model}`);
    }

    const text = messageContentToText(json.choices?.[0]?.message?.content);
    const u = json.usage ?? {};
    const prompt_tokens = u.prompt_tokens ?? 0;
    const completion_tokens = u.completion_tokens ?? 0;
    const total_tokens = u.total_tokens ?? prompt_tokens + completion_tokens;
    const nativeCost = u.total_cost ?? u.cost ?? u.native_tokens_cost ?? null;

    return {
      text,
      model,
      provider: "openrouter",
      usage: {
        prompt_tokens,
        completion_tokens,
        total_tokens,
        cost_usd: nativeCost,
      },
    };
  }

  throw new Error(lastError || "OpenRouter: all models in chain failed");
}

export async function completeOpenAI(
  apiKey: string,
  model: string,
  history: ChatTurn[],
  userMessage: string,
  systemPrompt: string,
): Promise<LlmResult> {
  const messages = messagesToOpenAiFormat(systemPrompt, history, userMessage);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUT,
      temperature: 0.35,
      messages,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";
  const u = json.usage ?? {};
  const prompt_tokens = u.prompt_tokens ?? 0;
  const completion_tokens = u.completion_tokens ?? 0;
  const total_tokens = u.total_tokens ?? prompt_tokens + completion_tokens;
  return {
    text,
    model,
    provider: "openai",
    usage: { prompt_tokens, completion_tokens, total_tokens, cost_usd: null },
  };
}

export async function completeAnthropic(
  apiKey: string,
  model: string,
  history: ChatTurn[],
  userMessage: string,
  systemPrompt: string,
): Promise<LlmResult> {
  const anthropicMessages: { role: "user" | "assistant"; content: string }[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUT,
      temperature: 0.35,
      system: systemPrompt,
      messages: anthropicMessages,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = json.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
  const u = json.usage ?? {};
  const prompt_tokens = u.input_tokens ?? 0;
  const completion_tokens = u.output_tokens ?? 0;
  const total_tokens = prompt_tokens + completion_tokens;
  return {
    text,
    model,
    provider: "anthropic",
    usage: { prompt_tokens, completion_tokens, total_tokens, cost_usd: null },
  };
}
