import { sanitizeError } from "@/lib/errorHandler";

/** Works when `instanceof Response` fails (e.g. cross-realm or polyfills). */
function isReadableResponseLike(x: unknown): x is { clone: () => unknown; json: () => Promise<unknown>; text: () => Promise<string> } {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.clone === "function" && typeof o.json === "function" && typeof o.text === "function";
}

function extractErrorFromParsedBody(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  let base: string | null = null;
  if (typeof o.error === "string" && o.error.trim()) base = o.error.trim();
  else if (o.error && typeof o.error === "object") {
    const inner = o.error as Record<string, unknown>;
    if (typeof inner.message === "string" && inner.message.trim()) base = inner.message.trim();
  } else if (typeof o.message === "string" && o.message.trim()) base = o.message.trim();

  if (!base) {
    if (typeof o.detail === "string" && o.detail.trim()) return o.detail.trim();
    return null;
  }
  if (typeof o.detail === "string" && o.detail.trim()) {
    const d = o.detail.trim();
    if (!base.includes(d)) return `${base} — ${d}`;
  }
  return base;
}

async function parseEdgeFunctionErrorBody(res: {
  clone: () => unknown;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}): Promise<string | null> {
  try {
    const clone = res.clone() as { json: () => Promise<unknown> };
    const parsed = await clone.json();
    return extractErrorFromParsedBody(parsed);
  } catch {
    try {
      const text = await res.clone().text();
      const trimmed = text.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("{")) {
        try {
          return extractErrorFromParsedBody(JSON.parse(trimmed));
        } catch {
          return trimmed.slice(0, 500);
        }
      }
      return trimmed.slice(0, 500);
    } catch {
      return null;
    }
  }
}

async function messageFromInvokeContext(context: unknown): Promise<string | null> {
  if (context instanceof Response || isReadableResponseLike(context)) {
    return parseEdgeFunctionErrorBody(context);
  }
  return null;
}

/**
 * Maps supabase.functions.invoke failures to actionable copy.
 * A 404 almost always means the function is not deployed to this Supabase project.
 * A fetch failure often means CORS, offline, or the same (preflight 404 surfaces as CORS in DevTools).
 */
export function describeFunctionInvokeError(functionName: string, error: unknown): string {
  if (!error || typeof error !== "object") {
    return sanitizeError(error);
  }

  const e = error as { name?: string; message?: string; context?: unknown };

  const ctx = e.context;
  const status =
    ctx instanceof Response
      ? ctx.status
      : isReadableResponseLike(ctx) && typeof (ctx as { status?: unknown }).status === "number"
        ? (ctx as { status: number }).status
        : undefined;

  if (
    (e.name === "FunctionsHttpError" || e.name === "FunctionsRelayError") &&
    (ctx instanceof Response || isReadableResponseLike(ctx))
  ) {
    if (status === 404) {
      return `The "${functionName}" Edge Function is not deployed to this Supabase project. Run: supabase functions deploy ${functionName} (or deploy it in the Supabase Dashboard).`;
    }
    if (status === 401) {
      return `Not signed in (or session expired) — sign in again and retry "${functionName}".`;
    }
    if (status === 403) {
      return `You don't have permission to call "${functionName}".`;
    }
    if (status === 429) {
      return `Too many requests for "${functionName}" — wait a bit and try again.`;
    }
  }

  if (
    e.name === "FunctionsFetchError" ||
    (typeof e.message === "string" && e.message.includes("Failed to send a request to the Edge Function"))
  ) {
    return `Could not reach "${functionName}". If the browser console shows CORS errors with status 404, deploy that Edge Function. Otherwise check ALLOWED_ORIGINS for your app URL and your network connection.`;
  }

  return sanitizeError(error);
}

/**
 * Message for a failed `functions.invoke` using JSON body `error` and optional `detail`
 * (e.g. Edge Function 5xx with structured body), then {@link describeFunctionInvokeError}.
 */
export function formatInvokeFailureMessage(functionName: string, error: unknown, data: unknown): string {
  const parts: string[] = [];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.error === "string" && o.error.trim()) parts.push(o.error.trim());
    if (typeof o.detail === "string" && o.detail.trim()) parts.push(o.detail.trim());
  }
  const combined = parts.filter(Boolean).join(" — ");
  if (combined) return combined;
  return describeFunctionInvokeError(functionName, error);
}

/**
 * Resolves a user-visible message when `supabase.functions.invoke` returns `{ error }`.
 * Prefer JSON body `error` from parsed `data` or from the error/invoke `Response` body
 * (`FunctionsHttpError` / `FunctionsRelayError` set `context` to the `Response`),
 * then fall back to {@link describeFunctionInvokeError}.
 *
 * Pass `invokeResponse` from the invoke result when available — same reference as
 * `error.context` for HTTP/relay failures, but useful if `context` is not a `Response`
 * in some runtimes.
 */
export async function getInvokeErrorMessage(
  functionName: string,
  error: unknown,
  data: unknown,
  invokeResponse?: Response | null,
): Promise<string> {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const errStr = typeof o.error === "string" ? o.error.trim() : "";
    const detailStr = typeof o.detail === "string" ? o.detail.trim() : "";
    if (errStr && detailStr) return `${errStr} — ${detailStr}`;
    if (detailStr && !errStr) return detailStr;
  }

  if (data && typeof data === "object" && "error" in data) {
    const errField = (data as { error?: unknown }).error;
    if (typeof errField === "string" && errField.trim()) {
      return extractErrorFromParsedBody(data) ?? errField.trim();
    }
    if (errField && typeof errField === "object" && "message" in errField) {
      const m = (errField as { message?: unknown }).message;
      if (typeof m === "string" && m.trim()) return extractErrorFromParsedBody(data) ?? m.trim();
    }
  }

  if (error && typeof error === "object") {
    const e = error as { name?: string; context?: unknown };
    if (e.name === "FunctionsHttpError" || e.name === "FunctionsRelayError") {
      const fromContext = await messageFromInvokeContext(e.context);
      if (fromContext) return fromContext;
    }
  }

  if (invokeResponse != null) {
    const fromInvoke = await messageFromInvokeContext(invokeResponse);
    if (fromInvoke) return fromInvoke;
  }

  return describeFunctionInvokeError(functionName, error);
}
