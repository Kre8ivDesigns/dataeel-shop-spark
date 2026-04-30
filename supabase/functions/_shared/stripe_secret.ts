import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptSettingValue } from "./decrypt_setting.ts";

type SupabaseAdmin = ReturnType<typeof createClient>;

/**
 * Stripe API secret resolution for Edge Functions:
 * 1. Admin → Settings (`app_settings`, decrypted with APP_SETTINGS_ENCRYPTION_KEY) — primary
 * 2. `STRIPE_SECRET_KEY` env — fallback (local dev / automation)
 *
 * Admin keys require `APP_SETTINGS_ENCRYPTION_KEY` (64+ hex chars). If unset or too short,
 * only the env fallback is used.
 */
export async function resolveStripeSecretKey(supabaseAdmin: SupabaseAdmin): Promise<string | null> {
  const encryptionKey = Deno.env.get("APP_SETTINGS_ENCRYPTION_KEY") ?? "";
  if (encryptionKey.length < 64) {
    return Deno.env.get("STRIPE_SECRET_KEY")?.trim() || null;
  }

  const { data: rows } = await supabaseAdmin
    .from("app_settings")
    .select("key, encrypted_value")
    .in("key", ["stripe_mode", "stripe_secret_key", "stripe_test_secret_key"]);

  const settings: Record<string, string> = {};
  for (const row of rows ?? []) {
    try {
      settings[row.key] = await decryptSettingValue(row.encrypted_value, encryptionKey);
    } catch {
      /* skip bad row */
    }
  }

  const mode = settings.stripe_mode ?? "live";
  const fromAdmin = mode === "test" ? settings.stripe_test_secret_key : settings.stripe_secret_key;
  const trimmed = fromAdmin?.trim();
  if (trimmed) return trimmed;

  return Deno.env.get("STRIPE_SECRET_KEY")?.trim() || null;
}
