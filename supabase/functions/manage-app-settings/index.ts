import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── AES-256-GCM helpers ─────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function importKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(keyHex.slice(0, 64)); // 32 bytes = 256 bits
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptValue(plaintext: string, keyHex: string): Promise<string> {
  const cryptoKey = await importKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, encoded);
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), 12);
  return btoa(String.fromCharCode(...combined));
}

async function decryptValue(ciphertextBase64: string, keyHex: string): Promise<string> {
  const cryptoKey = await importKey(keyHex);
  const combined = Uint8Array.from(atob(ciphertextBase64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const encryptionKey = Deno.env.get("APP_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey || encryptionKey.length < 64) {
      console.error("APP_SETTINGS_ENCRYPTION_KEY is missing or too short");
      return respond({ error: "Server misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) return respond({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return respond({ error: "Forbidden" }, 403);

    const body = await req.json();
    const { action } = body;

    // ── GET ────────────────────────────────────────────────────────────────
    if (action === "get") {
      const { data: rows, error: fetchErr } = await supabaseAdmin
        .from("app_settings")
        .select("key, encrypted_value");

      if (fetchErr) return respond({ error: fetchErr.message }, 500);

      const settings: Record<string, string> = {};
      for (const row of rows ?? []) {
        try {
          settings[row.key] = await decryptValue(row.encrypted_value, encryptionKey);
        } catch {
          // Skip rows that fail to decrypt (e.g. encrypted with old key)
          settings[row.key] = "";
        }
      }

      return respond({ settings });
    }

    // ── SET ────────────────────────────────────────────────────────────────
    if (action === "set") {
      const { settings } = body as { settings: Record<string, string> };
      if (!settings || typeof settings !== "object") {
        return respond({ error: "settings object is required" }, 400);
      }

      const upserts: { key: string; encrypted_value: string; updated_at: string }[] = [];

      for (const [key, value] of Object.entries(settings)) {
        if (typeof key !== "string" || typeof value !== "string") continue;
        // Empty string means "delete this key"
        if (value === "") {
          await supabaseAdmin.from("app_settings").delete().eq("key", key);
          continue;
        }
        const encrypted = await encryptValue(value, encryptionKey);
        upserts.push({ key, encrypted_value: encrypted, updated_at: new Date().toISOString() });
      }

      if (upserts.length > 0) {
        const { error: upsertErr } = await supabaseAdmin
          .from("app_settings")
          .upsert(upserts, { onConflict: "key" });
        if (upsertErr) return respond({ error: upsertErr.message }, 500);
      }

      return respond({ saved: true });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("manage-app-settings error:", err);
    return respond({ error: "Internal server error" }, 500);
  }
});
