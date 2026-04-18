import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptSettingValue } from "./decrypt_setting.ts";

export interface StripeConfig {
  mode: "test" | "live";
  secretKey: string;
  webhookSecret: string;
  source: "app_settings" | "env";
}

/**
 * Resolve the active Stripe secret key + webhook secret.
 *
 * Precedence:
 *   1. `app_settings.stripe_mode` + matching `stripe_*_secret_key` (admin-managed).
 *   2. Edge Function secrets (`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`).
 *
 * Admins who flip Test/Live in the UI get immediate effect without redeploying
 * as long as both key sets have been saved.
 */
export async function resolveStripeConfig(
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<StripeConfig> {
  const envSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const envWebhook = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  const encryptionKey = Deno.env.get("APP_SETTINGS_ENCRYPTION_KEY");

  const fallback: StripeConfig = {
    mode: envSecret.startsWith("sk_live_") ? "live" : "test",
    secretKey: envSecret,
    webhookSecret: envWebhook,
    source: "env",
  };

  if (!encryptionKey || encryptionKey.length < 64) return fallback;

  const { data: rows, error } = await supabaseAdmin
    .from("app_settings")
    .select("key, encrypted_value")
    .in("key", [
      "stripe_mode",
      "stripe_secret_key",
      "stripe_webhook_secret",
      "stripe_test_secret_key",
      "stripe_test_webhook_secret",
    ]);

  if (error || !rows?.length) return fallback;

  const decrypted: Record<string, string> = {};
  for (const row of rows) {
    try {
      decrypted[row.key] = await decryptSettingValue(row.encrypted_value, encryptionKey);
    } catch {
      /* ignore decrypt failures */
    }
  }

  const mode: "test" | "live" = decrypted.stripe_mode === "live" ? "live" : "test";
  const secretKey =
    mode === "live" ? decrypted.stripe_secret_key : decrypted.stripe_test_secret_key;
  const webhookSecret =
    mode === "live" ? decrypted.stripe_webhook_secret : decrypted.stripe_test_webhook_secret;

  if (!secretKey?.trim()) {
    return fallback;
  }

  return {
    mode,
    secretKey: secretKey.trim(),
    webhookSecret: (webhookSecret ?? "").trim() || envWebhook,
    source: "app_settings",
  };
}
