/**
 * Logs when required public env vars are missing so production misconfigurations are obvious in the console.
 */
export function logMissingPublicEnv(): void {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (url && key) return;

  const msg =
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Auth and Edge Functions will not work. Set them on your host (e.g. Vercel Environment Variables).";
  if (import.meta.env.PROD) {
    console.error("[dataeel]", msg);
  } else {
    console.warn("[dataeel]", msg);
  }
}
