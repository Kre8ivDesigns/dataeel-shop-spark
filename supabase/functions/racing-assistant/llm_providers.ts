export type ChatTurn = { role: "user" | "assistant"; content: string };

export type LlmResult = {
  text: string;
  model: string;
  provider: "openrouter" | "anthropic" | "openai";
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    /** From OpenRouter when present */
    cost_usd?: number | null;
  };
};

const MAX_OUT = 420;

/** Fallback $ per 1M tokens (input / output) when provider does not return cost. */
const FALLBACK_1M_USD: { test: (id: string) => boolean; in1m: number; out1m: number }[] = [
  { test: (id) => id.includes("gpt-4o-mini"), in1m: 0.15, out1m: 0.6 },
  { test: (id) => id.includes("gpt-4o") && !id.includes("mini"), in1m: 2.5, out1m: 10 },
  { test: (id) => id.includes("gpt-3.5"), in1m: 0.5, out1m: 1.5 },
  { test: (id) => id.includes("claude-3-5-haiku") || id.includes("claude-3-haiku"), in1m: 1.0, out1m: 5.0 },
  { test: (id) => id.includes("claude-3-5-sonnet"), in1m: 3.0, out1m: 15.0 },
  { test: (id) => id.includes("claude-3-opus"), in1m: 15.0, out1m: 75.0 },
  { test: (id) => id.startsWith("claude"), in1m: 3.0, out1m: 15.0 },
];

export function estimateCostUsd(
  provider: LlmResult["provider"],
  model: string,
  promptTokens: number,
  completionTokens: number,
  nativeCost?: number | null,
): number {
  if (typeof nativeCost === "number" && nativeCost >= 0 && !Number.isNaN(nativeCost)) {
    return Math.round(nativeCost * 1e6) / 1e6;
  }
  for (const row of FALLBACK_1M_USD) {
    if (row.test(model)) {
      return (promptTokens * row.in1m + completionTokens * row.out1m) / 1_000_000;
    }
  }
  if (provider === "openrouter") {
    return (promptTokens * 0.5 + completionTokens * 1.5) / 1_000_000;
  }
  if (provider === "anthropic") {
    return (promptTokens * 3 + completionTokens * 15) / 1_000_000;
  }
  return (promptTokens * 0.5 + completionTokens * 1.5) / 1_000_000;
}

function messagesToOpenAiFormat(system: string, history: ChatTurn[], userMessage: string) {
  return [
    { role: "system", content: system },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];
}

export async function completeOpenRouter(
  apiKey: string,
  model: string,
  history: ChatTurn[],
  userMessage: string,
  systemPrompt: string,
): Promise<LlmResult> {
  const messages = messagesToOpenAiFormat(systemPrompt, history, userMessage);
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": Deno.env.get("SITE_PUBLIC_URL") || "https://dataeel.com",
      "X-Title": "DATAEEL Racing Assistant",
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
    throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      /** Some OpenRouter responses include total cost in USD */
      cost?: number;
      total_cost?: number;
      native_tokens_cost?: number;
    };
  };
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";
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
