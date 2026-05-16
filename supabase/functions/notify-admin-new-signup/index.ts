/**
 * Database Webhook target: new user notification to admin via SMTP (app_settings).
 *
 * Security: `verify_jwt = false` — validate `ADMIN_SIGNUP_WEBHOOK_SECRET` via
 * `x-webhook-secret` (Supabase Database Webhook "Secret") or `Authorization: Bearer <secret>`.
 *
 * Configure (Dashboard → Database → Webhooks): table `profiles`, event INSERT, HTTP POST to
 * `.../functions/v1/notify-admin-new-signup`, add the same secret in webhook config + Edge secret.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptSettingValue } from "../_shared/decrypt_setting.ts";
import { smtpSendMail } from "../_shared/smtp_client.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function getHeaderCaseInsensitive(req: Request, name: string): string | null {
  const want = name.toLowerCase();
  for (const [k, v] of req.headers) {
    if (k.toLowerCase() === want) return v;
  }
  return null;
}

function verifyWebhookSecret(req: Request, expected: string | undefined): boolean {
  if (!expected || !expected.length) return false;
  const fromHeader = getHeaderCaseInsensitive(req, "x-webhook-secret");
  if (fromHeader && timingSafeEqual(fromHeader, expected)) return true;
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    if (timingSafeEqual(token, expected)) return true;
  }
  return false;
}

type DbWebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
  new?: Record<string, unknown> | null;
  old?: Record<string, unknown> | null;
};

function extractProfileInsert(payload: DbWebhookPayload): {
  user_id: string;
  email: string;
  full_name: string;
} | null {
  if ((payload.type ?? "").toUpperCase() !== "INSERT") return null;
  if ((payload.table ?? "") !== "profiles") return null;
  if ((payload.schema ?? "public") !== "public") return null;
  const row = (payload.record ?? payload.new) as Record<string, unknown> | null;
  if (!row || typeof row !== "object") return null;
  const user_id = row.user_id;
  const email = row.email;
  if (typeof user_id !== "string" || typeof email !== "string" || !email.length) return null;
  const full_name = typeof row.full_name === "string" ? row.full_name : "";
  return { user_id, email, full_name: full_name.trim() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-webhook-secret, content-type" } });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const secret = Deno.env.get("ADMIN_SIGNUP_WEBHOOK_SECRET")?.trim();
  if (!verifyWebhookSecret(req, secret)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const adminTo = Deno.env.get("ADMIN_NOTIFICATION_EMAIL")?.trim();

  const encryptionKey = Deno.env.get("APP_SETTINGS_ENCRYPTION_KEY");
  if (!encryptionKey || encryptionKey.length < 64) {
    console.error("notify-admin-new-signup: APP_SETTINGS_ENCRYPTION_KEY missing");
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  let payload: DbWebhookPayload;
  try {
    payload = (await req.json()) as DbWebhookPayload;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const profile = extractProfileInsert(payload);
  if (!profile) {
    return jsonResponse({ ok: true, ignored: true }, 200);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const smtpKeys = [
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_password",
    "smtp_from",
    "smtp_from_name",
    "smtp_reply_to",
    "site_public_url",
  ];
  const { data: smtpRows, error: smtpFetchErr } = await supabaseAdmin
    .from("app_settings")
    .select("key, encrypted_value")
    .in("key", smtpKeys);

  if (smtpFetchErr) {
    console.error("notify-admin-new-signup: smtp fetch", smtpFetchErr.message);
    return jsonResponse({ error: "Failed to load SMTP settings" }, 500);
  }

  const cfg: Record<string, string> = {};
  for (const row of smtpRows ?? []) {
    try {
      cfg[row.key] = await decryptSettingValue(row.encrypted_value, encryptionKey);
    } catch (e) {
      console.error(`notify-admin-new-signup: decrypt ${row.key}:`, e instanceof Error ? e.message : e);
    }
  }

  if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_password || !cfg.smtp_from) {
    console.error("notify-admin-new-signup: SMTP not fully configured in app_settings");
    return jsonResponse({ ok: true, skipped: "smtp_not_configured" }, 200);
  }

  const displayName = profile.full_name.length > 0 ? profile.full_name : "(not provided)";
  const sendResults: Record<string, unknown> = {};

  if (adminTo && EMAIL_RE.test(adminTo)) {
    const subject = `New user signup: ${profile.email}`;
    const textBody = [
      "A new user registered on DataEel.",
      "",
      `Email: ${profile.email}`,
      `Full name: ${displayName}`,
      `User ID: ${profile.user_id}`,
      "",
      "This message was sent by the notify-admin-new-signup Edge Function (database webhook on public.profiles).",
    ].join("\n");

    try {
      await smtpSendMail({
        host: cfg.smtp_host,
        port: parseInt(cfg.smtp_port || "587", 10),
        user: cfg.smtp_user,
        password: cfg.smtp_password,
        fromAddress: cfg.smtp_from,
        fromName: cfg.smtp_from_name || "DataEel",
        replyTo: cfg.smtp_reply_to || "",
        to: adminTo,
        subject,
        textBody,
      });
      sendResults.adminNotified = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "SMTP send failed";
      console.error("notify-admin-new-signup: admin smtp", msg);
      sendResults.adminError = "smtp_send_failed";
    }
  } else {
    console.error("notify-admin-new-signup: ADMIN_NOTIFICATION_EMAIL is missing or invalid");
    sendResults.adminSkipped = "admin_email_not_configured";
  }

  const { count: purchaseCount, error: purchaseErr } = await supabaseAdmin
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.user_id)
    .in("status", ["completed", "paid", "succeeded"]);

  const { data: balanceRow, error: balanceErr } = await supabaseAdmin
    .from("credit_balances")
    .select("credits")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  if (purchaseErr || balanceErr) {
    console.error(
      "notify-admin-new-signup: eligibility check",
      purchaseErr?.message ?? balanceErr?.message ?? "unknown",
    );
    sendResults.feedbackOfferSkipped = "eligibility_check_failed";
    return jsonResponse({ ok: true, ...sendResults }, 200);
  }

  const hasNoPurchases = (purchaseCount ?? 0) === 0;
  const hasNoCredits = Number(balanceRow?.credits ?? 0) <= 0;

  if (hasNoPurchases && hasNoCredits && EMAIL_RE.test(profile.email)) {
    const { data: offer, error: offerErr } = await supabaseAdmin
      .from("feedback_credit_offers")
      .upsert(
        {
          user_id: profile.user_id,
          email: profile.email,
          source: "signup_no_purchase",
          sent_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("offer_token")
      .single();

    if (offerErr || !offer?.offer_token) {
      console.error("notify-admin-new-signup: feedback offer upsert", offerErr?.message ?? "missing token");
      sendResults.feedbackOfferSkipped = "offer_create_failed";
      return jsonResponse({ ok: true, ...sendResults }, 200);
    }

    const siteUrl = (cfg.site_public_url || Deno.env.get("SITE_PUBLIC_URL") || "https://www.dataeel.com").replace(/\/$/, "");
    const feedbackUrl = `${siteUrl}/feedback?offer=${encodeURIComponent(offer.offer_token)}`;
    const firstName = profile.full_name.trim().split(/\s+/)[0] || "there";
    const textBody = [
      `Hi ${firstName},`,
      "",
      "Thanks for visiting DATAEEL and creating an account.",
      "",
      "We would genuinely value your feedback before you buy credits. What made you register, and what would make DATAEEL more useful for you?",
      "",
      "As thanks for your response, we will add one RaceCard credit to your account after you submit feedback on the website:",
      feedbackUrl,
      "",
      "The credit is available once per account and only before your first purchase.",
      "",
      "Thank you,",
      "The DATAEEL Team",
    ].join("\n");

    try {
      await smtpSendMail({
        host: cfg.smtp_host,
        port: parseInt(cfg.smtp_port || "587", 10),
        user: cfg.smtp_user,
        password: cfg.smtp_password,
        fromAddress: cfg.smtp_from,
        fromName: cfg.smtp_from_name || "DataEel",
        replyTo: cfg.smtp_reply_to || "",
        to: profile.email,
        subject: "Tell us what you think and get 1 RaceCard credit",
        textBody,
      });
      sendResults.feedbackOfferSent = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "SMTP send failed";
      console.error("notify-admin-new-signup: feedback smtp", msg);
      sendResults.feedbackOfferSkipped = "smtp_send_failed";
    }
  } else {
    sendResults.feedbackOfferSkipped = "not_eligible";
  }

  return jsonResponse({ ok: true, ...sendResults }, 200);
});
