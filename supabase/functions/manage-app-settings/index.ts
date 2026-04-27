import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── AES-256-GCM helpers ─────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

async function importKey(keyHex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", hexToBytes(keyHex.slice(0, 64)), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptValue(plaintext: string, keyHex: string): Promise<string> {
  const key = await importKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  const combined = new Uint8Array(12 + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), 12);
  return btoa(String.fromCharCode(...combined));
}

async function decryptValue(b64: string, keyHex: string): Promise<string> {
  const key = await importKey(keyHex);
  const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: combined.slice(0, 12) }, key, combined.slice(12));
  return new TextDecoder().decode(decrypted);
}

// ── SMTP client ──────────────────────────────────────────────────────────────

type SmtpConn = Deno.TcpConn | Deno.TlsConn;

/** Read a full SMTP response (may be multiline, ends on "NNN <text>\r\n"). */
async function smtpRead(conn: SmtpConn): Promise<string> {
  const dec = new TextDecoder();
  let buf = "";
  const chunk = new Uint8Array(4096);
  while (true) {
    const n = await conn.read(chunk);
    if (n === null) break;
    buf += dec.decode(chunk.subarray(0, n));
    // Final line of a (possibly multiline) SMTP response has "DDD " (code + space)
    if (/^\d{3} /m.test(buf) && buf.endsWith("\r\n")) break;
    // Also handle single-line without CRLF at end (defensive)
    if (/^\d{3} .+/.test(buf.trim())) break;
  }
  return buf;
}

async function smtpWrite(conn: SmtpConn, line: string): Promise<void> {
  await conn.write(new TextEncoder().encode(line + "\r\n"));
}

function smtpCode(resp: string): number {
  return parseInt(resp.slice(0, 3), 10);
}

interface SmtpMailOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  fromAddress: string;
  fromName: string;
  replyTo: string;
  to: string;
}

async function smtpSendTestMail(opts: SmtpMailOptions): Promise<void> {
  const { host, port, user, password, fromAddress, fromName, replyTo, to } = opts;
  const useDirectTls = port === 465;

  let conn: SmtpConn = useDirectTls
    ? await Deno.connectTls({ hostname: host, port })
    : await Deno.connect({ hostname: host, port });

  try {
    // Greeting
    const greeting = await smtpRead(conn);
    if (smtpCode(greeting) !== 220) throw new Error(`Unexpected greeting: ${greeting.slice(0, 80)}`);

    // EHLO
    await smtpWrite(conn, "EHLO shopsmtp.client");
    const ehloResp = await smtpRead(conn);
    if (smtpCode(ehloResp) !== 250) throw new Error(`EHLO failed: ${ehloResp.slice(0, 80)}`);

    // STARTTLS for port 587 (or non-SSL)
    if (!useDirectTls) {
      if (!ehloResp.toUpperCase().includes("STARTTLS")) {
        throw new Error("SMTP server does not advertise STARTTLS");
      }
      await smtpWrite(conn, "STARTTLS");
      const tlsResp = await smtpRead(conn);
      if (smtpCode(tlsResp) !== 220) throw new Error(`STARTTLS failed: ${tlsResp.slice(0, 80)}`);

      // Upgrade the connection to TLS
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: host });

      // Re-greet after TLS
      await smtpWrite(conn, "EHLO shopsmtp.client");
      const ehlo2 = await smtpRead(conn);
      if (smtpCode(ehlo2) !== 250) throw new Error(`EHLO after STARTTLS failed: ${ehlo2.slice(0, 80)}`);
    }

    // AUTH PLAIN
    const authStr = `\0${user}\0${password}`;
    const authB64 = btoa(unescape(encodeURIComponent(authStr)));
    await smtpWrite(conn, `AUTH PLAIN ${authB64}`);
    const authResp = await smtpRead(conn);
    if (smtpCode(authResp) !== 235) throw new Error(`Authentication failed: ${authResp.slice(0, 120)}`);

    // MAIL FROM
    await smtpWrite(conn, `MAIL FROM:<${fromAddress}>`);
    const fromResp = await smtpRead(conn);
    if (smtpCode(fromResp) !== 250) throw new Error(`MAIL FROM rejected: ${fromResp.slice(0, 80)}`);

    // RCPT TO
    await smtpWrite(conn, `RCPT TO:<${to}>`);
    const rcptResp = await smtpRead(conn);
    if (smtpCode(rcptResp) !== 250) throw new Error(`RCPT TO rejected: ${rcptResp.slice(0, 80)}`);

    // DATA
    await smtpWrite(conn, "DATA");
    const dataResp = await smtpRead(conn);
    if (smtpCode(dataResp) !== 354) throw new Error(`DATA rejected: ${dataResp.slice(0, 80)}`);

    // Build and send message
    const date = new Date().toUTCString();
    // Sanitize header values to prevent header injection
    const safeFromName = fromName.replace(/[\r\n]/g, " ").trim();
    const safeReplyTo = replyTo.replace(/[\r\n]/g, " ").trim();
    const lines: string[] = [
      `From: "${safeFromName}" <${fromAddress}>`,
      `To: ${to}`,
      `Subject: SMTP Test — DataEel Admin`,
      `Date: ${date}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
    ];
    if (safeReplyTo) lines.push(`Reply-To: ${safeReplyTo}`);
    lines.push("", "This is a test email from your DataEel admin panel.", "Your SMTP configuration is working correctly!");

    // Write the message body followed by the SMTP DATA terminator ("\r\n.\r\n")
    const body = lines.join("\r\n") + "\r\n.\r\n";
    await conn.write(new TextEncoder().encode(body));
    const sentResp = await smtpRead(conn);
    if (smtpCode(sentResp) !== 250) throw new Error(`Message rejected: ${sentResp.slice(0, 80)}`);

    // QUIT
    await smtpWrite(conn, "QUIT");
  } finally {
    try { conn.close(); } catch { /* ignore */ }
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  try {
    const encryptionKey = Deno.env.get("APP_SETTINGS_ENCRYPTION_KEY");
    if (!encryptionKey || encryptionKey.length < 64) {
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

    // ── GET: return presence + 4-char preview only — never full values ─────
    if (action === "get") {
      const { data: rows, error: fetchErr } = await supabaseAdmin
        .from("app_settings")
        .select("key, encrypted_value");

      if (fetchErr) return respond({ error: fetchErr.message }, 500);

      const settings: Record<string, { configured: boolean; preview: string | null }> = {};
      for (const row of rows ?? []) {
        try {
          const value = await decryptValue(row.encrypted_value, encryptionKey);
          const configured = value.length > 0;
          const preview = configured
            ? (value.length > 4 ? `••••••••${value.slice(-4)}` : "••••")
            : null;
          settings[row.key] = { configured, preview };
        } catch {
          settings[row.key] = { configured: false, preview: null };
        }
      }

      // Audit: admin viewed settings
      await supabaseAdmin.from("audit_log").insert({
        actor_id: user.id,
        action: "admin.settings.viewed",
        resource: "app_settings",
        resource_id: null,
        detail: { keys_viewed: (rows ?? []).map((r) => r.key) },
      });

      return respond({ settings });
    }

    // ── SET: encrypt and upsert; empty string = skip (keep existing) ───────
    if (action === "set") {
      const { settings } = body as { settings: Record<string, string> };
      if (!settings || typeof settings !== "object") {
        return respond({ error: "settings object is required" }, 400);
      }

      const upserts: { key: string; encrypted_value: string; updated_at: string }[] = [];
      const updatedKeys: string[] = [];

      for (const [key, value] of Object.entries(settings)) {
        if (typeof key !== "string" || typeof value !== "string") continue;
        if (value === "") continue; // Empty = keep existing, do not delete
        const encrypted = await encryptValue(value, encryptionKey);
        upserts.push({ key, encrypted_value: encrypted, updated_at: new Date().toISOString() });
        updatedKeys.push(key);
      }

      if (upserts.length > 0) {
        const { error: upsertErr } = await supabaseAdmin
          .from("app_settings")
          .upsert(upserts, { onConflict: "key" });
        if (upsertErr) return respond({ error: upsertErr.message }, 500);
      }

      // Audit: admin changed settings (log key names only, never values)
      if (updatedKeys.length > 0) {
        await supabaseAdmin.from("audit_log").insert({
          actor_id: user.id,
          action: "admin.settings.updated",
          resource: "app_settings",
          resource_id: null,
          detail: { keys_updated: updatedKeys },
        });
      }

      return respond({ saved: true });
    }

    // ── SMTP_TEST: decrypt SMTP settings and send a test email ─────────────
    if (action === "smtp_test") {
      const { test_to } = body as { test_to?: string };
      if (!test_to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(test_to)) {
        return respond({ error: "A valid test_to email address is required" }, 400);
      }

      const smtpKeys = ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from", "smtp_from_name", "smtp_reply_to"];
      const { data: smtpRows, error: smtpFetchErr } = await supabaseAdmin
        .from("app_settings")
        .select("key, encrypted_value")
        .in("key", smtpKeys);

      if (smtpFetchErr) return respond({ error: smtpFetchErr.message }, 500);

      const cfg: Record<string, string> = {};
      for (const row of smtpRows ?? []) {
        try { cfg[row.key] = await decryptValue(row.encrypted_value, encryptionKey); } catch (decErr) {
          console.error(`manage-app-settings: failed to decrypt smtp setting '${row.key}':`, decErr instanceof Error ? decErr.message : "unknown");
        }
      }

      if (!cfg.smtp_host) return respond({ error: "smtp_host is not configured" }, 400);
      if (!cfg.smtp_user) return respond({ error: "smtp_user is not configured" }, 400);
      if (!cfg.smtp_password) return respond({ error: "smtp_password is not configured" }, 400);
      if (!cfg.smtp_from) return respond({ error: "smtp_from is not configured" }, 400);

      try {
        await smtpSendTestMail({
          host: cfg.smtp_host,
          port: parseInt(cfg.smtp_port || "587", 10),
          user: cfg.smtp_user,
          password: cfg.smtp_password,
          fromAddress: cfg.smtp_from,
          fromName: cfg.smtp_from_name || "DataEel",
          replyTo: cfg.smtp_reply_to || "",
          to: test_to,
        });
      } catch (smtpErr: unknown) {
        const msg = smtpErr instanceof Error ? smtpErr.message : "SMTP send failed";
        return respond({ error: msg }, 500);
      }

      // Audit: test email sent (recipient logged, no credentials)
      await supabaseAdmin.from("audit_log").insert({
        actor_id: user.id,
        action: "admin.smtp.test_sent",
        resource: "app_settings",
        resource_id: null,
        detail: { test_to },
      });

      return respond({ ok: true });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("manage-app-settings error:", err instanceof Error ? err.message : "unknown");
    return respond({ error: "Internal server error" }, 500);
  }
});

