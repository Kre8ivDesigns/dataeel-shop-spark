import { describe, expect, it } from "vitest";
import {
  buildOpenRouterModelChain,
  isOpenRouterRetryableStatus,
  OPENROUTER_DEFAULT_FREE_MODELS,
} from "./openrouter_chain.ts";
import {
  buildOpenAIChatCompletionPayload,
  usesOpenAIMaxCompletionTokens,
} from "./llm_providers.ts";

describe("buildOpenRouterModelChain", () => {
  it("puts env primary first then defaults without duplicates", () => {
    const chain = buildOpenRouterModelChain({
      envPrimary: "custom/model",
      adminModel: OPENROUTER_DEFAULT_FREE_MODELS[0],
    });
    expect(chain[0]).toBe("custom/model");
    expect(chain.filter((m) => m === OPENROUTER_DEFAULT_FREE_MODELS[0]).length).toBe(1);
  });

  it("includes admin model after defaults when unique", () => {
    const chain = buildOpenRouterModelChain({
      adminModel: "paid/vendor-model",
    });
    expect(chain.slice(0, OPENROUTER_DEFAULT_FREE_MODELS.length)).toEqual([
      ...OPENROUTER_DEFAULT_FREE_MODELS,
    ]);
    expect(chain[chain.length - 1]).toBe("paid/vendor-model");
  });

  it("parses OPENROUTER_MODEL_FALLBACKS-style CSV after defaults", () => {
    const chain = buildOpenRouterModelChain({
      envFallbacksCsv: "a/x,b/y",
    });
    expect(chain.includes("a/x")).toBe(true);
    expect(chain.includes("b/y")).toBe(true);
    expect(chain.indexOf("a/x")).toBeGreaterThan(OPENROUTER_DEFAULT_FREE_MODELS.length - 1);
  });
});

describe("isOpenRouterRetryableStatus", () => {
  it("retries 429 and 5xx only", () => {
    expect(isOpenRouterRetryableStatus(429)).toBe(true);
    expect(isOpenRouterRetryableStatus(500)).toBe(true);
    expect(isOpenRouterRetryableStatus(503)).toBe(true);
    expect(isOpenRouterRetryableStatus(400)).toBe(false);
    expect(isOpenRouterRetryableStatus(401)).toBe(false);
  });
});

describe("buildOpenAIChatCompletionPayload", () => {
  const messages = [{ role: "user", content: "Analyze funnel metrics." }];

  it("uses max_tokens for legacy chat models", () => {
    const payload = buildOpenAIChatCompletionPayload("gpt-4o-mini", messages, 1200, 0.35);
    expect(payload.max_tokens).toBe(1200);
    expect(payload.max_completion_tokens).toBeUndefined();
    expect(payload.temperature).toBe(0.35);
  });

  it("uses max_completion_tokens for reasoning and GPT-5 models", () => {
    expect(usesOpenAIMaxCompletionTokens("o3-mini")).toBe(true);
    expect(usesOpenAIMaxCompletionTokens("gpt-5-mini")).toBe(true);

    const payload = buildOpenAIChatCompletionPayload("o3-mini", messages, 1200, 0.35);
    expect(payload.max_completion_tokens).toBe(1200);
    expect(payload.max_tokens).toBeUndefined();
    expect(payload.temperature).toBeUndefined();
  });
});
