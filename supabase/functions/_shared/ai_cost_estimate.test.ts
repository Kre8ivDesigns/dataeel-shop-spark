import { describe, expect, it } from "vitest";
import { estimateCostUsd, estimateMaxSingleTurnCostUsd, roughPromptTokenEstimate } from "./ai_cost_estimate.ts";

describe("ai_cost_estimate", () => {
  it("estimateCostUsd prefers native cost when set", () => {
    expect(estimateCostUsd("openai", "gpt-4o-mini", 1000, 500, 0.0042)).toBe(0.0042);
  });

  it("estimateMaxSingleTurnCostUsd uses max completion budget", () => {
    const promptEst = roughPromptTokenEstimate("x".repeat(400), [], "hi");
    const maxTurn = estimateMaxSingleTurnCostUsd("openrouter", "openai/gpt-4o-mini", promptEst);
    const explicit = estimateCostUsd("openrouter", "openai/gpt-4o-mini", promptEst, 420, null);
    expect(maxTurn).toBe(explicit);
  });

  it("roughPromptTokenEstimate scales with text length", () => {
    const a = roughPromptTokenEstimate("ab", [], "cd");
    const b = roughPromptTokenEstimate("ab".repeat(100), [], "cd");
    expect(b).toBeGreaterThan(a);
  });
});
