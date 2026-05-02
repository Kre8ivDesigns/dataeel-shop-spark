/**
 * OpenRouter model fallback chain (free-tier first) for racing-assistant.
 * Pure helpers — no Deno imports (Vitest-friendly).
 */

/** Default free models: primary → fallbacks (adjust via env in caller). */
export const OPENROUTER_DEFAULT_FREE_MODELS = [
  "openai/gpt-oss-120b:free",
  "google/gemma-4-31b-it:free",
  "openai/gpt-oss-20b:free",
] as const;

export type OpenRouterChainInput = {
  /** OPENROUTER_MODEL — optional first model (overrides default free primary). */
  envPrimary?: string;
  /** OPENROUTER_MODEL_FALLBACKS — comma-separated models inserted after primary attempts. */
  envFallbacksCsv?: string;
  /** Admin Settings → OpenRouter model — appended if not already listed. */
  adminModel?: string;
};

export function buildOpenRouterModelChain(input: OpenRouterChainInput): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (m: string) => {
    const t = m.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  const primary = (input.envPrimary ?? "").trim();
  if (primary) push(primary);

  for (const m of OPENROUTER_DEFAULT_FREE_MODELS) push(m);

  const extra = (input.envFallbacksCsv ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const m of extra) push(m);

  const admin = (input.adminModel ?? "").trim();
  if (admin) push(admin);

  return out;
}

/** Retry next model on rate limit or server errors only. */
export function isOpenRouterRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}
