/**
 * Browser origins allowed to invoke Edge Functions (CORS) and used to validate
 * `Origin` for Stripe checkout / billing-portal return URLs.
 *
 * Production / custom domain
 * -------------------------
 * In Supabase Dashboard: Project Settings → Edge Functions → Secrets, add:
 *   ALLOWED_ORIGINS=https://www.yourdomain.com,https://yourdomain.com
 * Rules:
 *   - Comma-separated list, no spaces (or trim your values in the secret).
 *   - Include `https://` (or `http://` for local only).
 *   - No trailing slash.
 *   - Add preview hosts if you use them (e.g. https://*.vercel.app or a fixed preview URL).
 *
 * If `ALLOWED_ORIGINS` is not set, the fallback list below is used (local dev +
 * legacy preview hosts). For a new production domain, set the secret and redeploy
 * functions; you can remove obsolete hosts from the fallback when no longer needed.
 */
const FALLBACK_ORIGINS = [
  "https://dataeel-shop-spark-three.vercel.app",
  "https://dataeel-shop-spark.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

export function getAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS");
  if (raw?.trim()) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [...FALLBACK_ORIGINS];
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = getAllowedOrigins();
  const allowedOrigin = allowed.includes(origin) ? origin : allowed[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

/** Use when building return URLs (Stripe portal, checkout success) from the caller origin. */
export function getValidatedOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  const allowed = getAllowedOrigins();
  return allowed.includes(origin) ? origin : allowed[0] ?? "";
}
