import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { smtpSendMail } from "../_shared/smtp_client.ts";

// ── AES-256-GCM helpers (copied from manage-app-settings) ────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

async function importKey(keyHex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", hexToBytes(keyHex.slice(0, 64)), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function decryptValue(b64: string, keyHex: string): Promise<string> {
  const key = await importKey(keyHex);
  const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: combined.slice(0, 12) }, key, combined.slice(12));
  return new TextDecoder().decode(decrypted);
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  try {
    const encryptionKey = Deno.env.get("APP_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey || encryptionKey.length < 64) {
      return respond({ error: "Server misconfigured: APP_SETTINGS_ENCRYPTION_KEY not set" }, 500);
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

    // ── preview: return recipient count without sending ─────────────────────
    if (body.action === "preview") {
      const { data: usersPage, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
      if (listErr) return respond({ error: listErr.message }, 500);
      return respond({ count: usersPage.total ?? 0 });
    }

    // ── send: broadcast email to all confirmed users ────────────────────────
    if (body.action === "send") {
      const { subject, text_body } = body as { subject?: string; text_body?: string };

      if (!subject || typeof subject !== "string" || subject.trim() === "") {
        return respond({ error: "subject is required" }, 400);
      }
      if (!text_body || typeof text_body !== "string" || text_body.trim() === "") {
        return respond({ error: "text_body is required" }, 400);
      }
      if (subject.trim().length > 998) {
        return respond({ error: "subject must be under 998 characters" }, 400);
      }

      // Load SMTP credentials
      const smtpKeys = ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from", "smtp_from_name", "smtp_reply_to"];
      const { data: smtpRows, error: smtpFetchErr } = await supabaseAdmin
        .from("app_settings")
        .select("key, encrypted_value")
        .in("key", smtpKeys);

      if (smtpFetchErr) return respond({ error: smtpFetchErr.message }, 500);

      const cfg: Record<string, string> = {};
      for (const row of smtpRows ?? []) {
        try { cfg[row.key] = await decryptValue(row.encrypted_value, encryptionKey); } catch {
          // skip keys that fail to decrypt
        }
      }

      if (!cfg.smtp_host) return respond({ error: "SMTP not configured: smtp_host missing" }, 400);
      if (!cfg.smtp_user) return respond({ error: "SMTP not configured: smtp_user missing" }, 400);
      if (!cfg.smtp_password) return respond({ error: "SMTP not configured: smtp_password missing" }, 400);
      if (!cfg.smtp_from) return respond({ error: "SMTP not configured: smtp_from missing" }, 400);

      // Collect all user emails (paginated, max 10 000 users)
      const emails: string[] = [];
      let page = 1;
      while (true) {
        const { data: batch, error: batchErr } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (batchErr) return respond({ error: `Failed to list users: ${batchErr.message}` }, 500);
        for (const u of batch.users) {
          if (u.email && u.email_confirmed_at) emails.push(u.email);
        }
        if (batch.users.length < 1000) break;
        page++;
      }

      if (emails.length === 0) {
        return respond({ error: "No confirmed users found" }, 400);
      }

      // Send one email per recipient (sequential to respect SMTP rate limits)
      let sent = 0;
      const failures: { email: string; error: string }[] = [];

      for (const to of emails) {
        try {
          await smtpSendMail({
            host: cfg.smtp_host,
            port: parseInt(cfg.smtp_port || "587", 10),
            user: cfg.smtp_user,
            password: cfg.smtp_password,
            fromAddress: cfg.smtp_from,
            fromName: cfg.smtp_from_name || "DATAEEL",
            replyTo: cfg.smtp_reply_to || "",
            to,
            subject: subject.trim(),
            textBody: text_body.trim(),
          });
          sent++;
        } catch (err: unknown) {
          failures.push({ email: to, error: err instanceof Error ? err.message : "unknown" });
        }
      }

      // Audit log — never log message body, only metadata
      await supabaseAdmin.from("audit_log").insert({
        actor_id: user.id,
        action: "admin.broadcast_email.sent",
        resource: "users",
        resource_id: null,
        detail: {
          subject: subject.trim().slice(0, 200),
          total: emails.length,
          sent,
          failed: failures.length,
        },
      });

      return respond({ sent, failed: failures.length, total: emails.length });
    }

    return respond({ error: `Unknown action: ${body.action}` }, 400);
  } catch (err) {
    console.error("send-broadcast-email error:", err instanceof Error ? err.message : "unknown");
    return respond({ error: "Internal server error" }, 500);
  }
});
