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
  if (
    msg.includes("does not exist") &&
    (msg.includes("function") ||
      msg.includes("add_credits_atomic") ||
      msg.includes("grant_unlimited_credits_atomic"))
  ) {
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

/** When true, error JSON may include `message` / Postgres fields (set WEBHOOK_EXPOSE_ERRORS=true on the Edge Function). */
export function exposeWebhookErrorDetail(): boolean {
  const explicit = envGet("WEBHOOK_EXPOSE_ERRORS");
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return envGet("SUPABASE_INTERNAL_FUNCTIONS_RUNTIME") === "local";
}

function isPostgresLike(
  err: unknown,
): err is { message: string; code?: string; details?: string | null; hint?: string | null } {
  return typeof err === "object" && err !== null && typeof (err as { message?: unknown }).message === "string";
}

/**
 * Human-readable + Postgres fields from Supabase/PostgREST errors (plain objects, not Error subclasses).
 */
export function formatWebhookErrDetail(err: unknown): string {
  if (err instanceof Error) {
    return err.stack ?? err.message;
  }
  if (isPostgresLike(err)) {
    const bits = [err.message];
    if (err.code) bits.push(`code=${err.code}`);
    if (err.details) bits.push(`details=${String(err.details)}`);
    if (err.hint) bits.push(`hint=${String(err.hint)}`);
    return bits.join(" | ");
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function jsonErrBody(publicMsg: string, err: unknown): Record<string, unknown> {
  const body: Record<string, unknown> = { error: publicMsg };
  if (exposeWebhookErrorDetail()) {
    body.message = formatWebhookErrDetail(err);
    if (isPostgresLike(err)) {
      if (err.code) body.postgres_code = err.code;
      if (err.details) body.postgres_detail = err.details;
      if (err.hint) body.postgres_hint = err.hint;
    }
  }
  return body;
}
