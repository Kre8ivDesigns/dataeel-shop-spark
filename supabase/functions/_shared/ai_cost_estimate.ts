/**
 * Cost estimation for racing-assistant (USD). Used for audit logs, daily caps, and usage totals.
 *
 * When the provider returns native `cost_usd`, that wins. Otherwise we apply rough $/1M token
 * rates by model id substring (same buckets as before). Unknown models fall back to conservative
 * generic rates per provider (see estimateCostUsd).
 */

export type ChatTurn = { role: "user" | "assistant"; content: string };

export const RACING_ASSISTANT_MAX_COMPLETION_TOKENS = 420;

/** ~4 chars per token (common heuristic for English). */
export function roughPromptTokenEstimate(
  systemPrompt: string,
  history: ChatTurn[],
  userMessage: string,
): number {
  let chars = systemPrompt.length + userMessage.length;
  for (const m of history) chars += m.content.length;
  // Small overhead for JSON/message framing in provider APIs
  const overhead = 24 + history.length * 8;
  return Math.ceil((chars + overhead) / 4);
}

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

export type LlmProviderTag = "openrouter" | "anthropic" | "openai";

export function estimateCostUsd(
  provider: LlmProviderTag,
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

/**
 * Upper bound for one racing-assistant turn: assume completion uses the full max output budget.
 * Compares to daily cap before calling the LLM.
 */
export function estimateMaxSingleTurnCostUsd(
  provider: LlmProviderTag,
  model: string,
  estimatedPromptTokens: number,
): number {
  return estimateCostUsd(
    provider,
    model,
    estimatedPromptTokens,
    RACING_ASSISTANT_MAX_COMPLETION_TOKENS,
    null,
  );
}
