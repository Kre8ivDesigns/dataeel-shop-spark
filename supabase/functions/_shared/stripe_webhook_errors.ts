/**
 * Map DB errors so Stripe webhooks return 2xx when retrying cannot fix the issue
 * (bad metadata user_id, missing migrations, etc.).
 */

export type DbAckReason =
  | "foreign_key_violation"
  | "schema_mismatch"
  | "function_missing"
  | "not_null_violation"
  | "unknown";

export function acknowledgeOnlyDbError(error: {
  code?: string;
  message?: string;
}): { acknowledge: boolean; reason: DbAckReason } {
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();

  if (code === "23503") {
    return { acknowledge: true, reason: "foreign_key_violation" };
  }
  if (code === "42703") {
    return { acknowledge: true, reason: "schema_mismatch" };
  }
  /** NOT NULL — migrations / drift; retries won't fix until DB is repaired */
  if (code === "23502") {
    return { acknowledge: true, reason: "not_null_violation" };
  }
  /** undefined_function — e.g. old DB missing add_credits_atomic(uuid,int,text,uuid,jsonb) */
  if (code === "42883") {
    return { acknowledge: true, reason: "function_missing" };
  }
  if (msg.includes("foreign key") || msg.includes("violates foreign key constraint")) {
    return { acknowledge: true, reason: "foreign_key_violation" };
  }
  if (
    (msg.includes("column") && msg.includes("does not exist")) ||
    (msg.includes("relation") && msg.includes("does not exist"))
  ) {
    return { acknowledge: true, reason: "schema_mismatch" };
  }
  if (msg.includes("does not exist") && (msg.includes("function") || msg.includes("add_credits_atomic"))) {
    return { acknowledge: true, reason: "function_missing" };
  }
  if (msg.includes("permission denied") && msg.includes("function")) {
    return { acknowledge: true, reason: "schema_mismatch" };
  }

  return { acknowledge: false, reason: "unknown" };
}

function envGet(key: string): string | undefined {
  const deno = (globalThis as Record<string, { env?: { get: (k: string) => string | undefined } }>)["Deno"];
  return deno?.env?.get?.(key);
}

/** When true, error JSON may include a `message` field (set WEBHOOK_EXPOSE_ERRORS or run locally). */
export function exposeWebhookErrorDetail(): boolean {
  const explicit = envGet("WEBHOOK_EXPOSE_ERRORS");
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return envGet("SUPABASE_INTERNAL_FUNCTIONS_RUNTIME") === "local";
}

export function jsonErrBody(publicMsg: string, err: unknown): Record<string, unknown> {
  const body: Record<string, unknown> = { error: publicMsg };
  if (exposeWebhookErrorDetail()) {
    body.message = err instanceof Error ? err.message : String(err);
  }
  return body;
}
