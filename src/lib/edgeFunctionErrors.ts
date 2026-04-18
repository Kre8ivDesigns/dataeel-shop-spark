import { sanitizeError } from "@/lib/errorHandler";

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

  if (e.name === "FunctionsHttpError" && e.context instanceof Response) {
    if (e.context.status === 404) {
      return `The "${functionName}" Edge Function is not deployed to this Supabase project. Run: supabase functions deploy ${functionName} (or deploy it in the Supabase Dashboard).`;
    }
    if (e.context.status === 401) {
      return `Not signed in (or session expired) — sign in again and retry "${functionName}".`;
    }
    if (e.context.status === 403) {
      return `You don't have permission to call "${functionName}".`;
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
