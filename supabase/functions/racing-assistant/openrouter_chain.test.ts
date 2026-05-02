import { describe, expect, it } from "vitest";
import {
  buildOpenRouterModelChain,
  isOpenRouterRetryableStatus,
  OPENROUTER_DEFAULT_FREE_MODELS,
} from "./openrouter_chain.ts";

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
