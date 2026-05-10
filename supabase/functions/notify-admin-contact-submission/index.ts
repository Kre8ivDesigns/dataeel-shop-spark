/**
 * Sends an admin email notification for a public contact form submission.
 *
 * The browser supplies only the stored submission UUID. This function fetches
 * the row with the service role and always sends to ADMIN_NOTIFICATION_EMAIL.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptSettingValue } from "../_shared/decrypt_setting.ts";
import { smtpSendMail } from "../_shared/smtp_client.ts";

const JSON_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

const SMTP_KEYS = ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from", "smtp_from_name", "smtp_reply_to"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactSubmission = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  category: string;
  subject: string | null;
  message: string;
  user_id: string | null;
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function cleanText(value: unknown, fallback = "(not provided)"): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\r/g, "").trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: JSON_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { submissionId?: unknown };
  try {
    body = (await req.json()) as { submissionId?: unknown };
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const submissionId = typeof body.submissionId === "string" ? body.submissionId.trim() : "";
  if (!UUID_RE.test(submissionId)) {
    return jsonResponse({ error: "Invalid submission id" }, 400);
  }

  const encryptionKey = Deno.env.get("APP_SETTINGS_ENCRYPTION_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!encryptionKey || encryptionKey.length < 64 || !supabaseUrl || !serviceKey) {
    console.error("notify-admin-contact-submission: required Edge secrets are missing");
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const { data: submission, error: submissionErr } = await supabaseAdmin
    .from("contact_submissions")
    .select("id, created_at, name, email, category, subject, message, user_id")
    .eq("id", submissionId)
    .maybeSingle<ContactSubmission>();

  if (submissionErr) {
    console.error("notify-admin-contact-submission: submission fetch", submissionErr.message);
    return jsonResponse({ error: "Failed to load contact submission" }, 500);
  }
  if (!submission) {
    return jsonResponse({ error: "Submission not found" }, 404);
  }

  const { data: smtpRows, error: smtpFetchErr } = await supabaseAdmin
    .from("app_settings")
    .select("key, encrypted_value")
    .in("key", SMTP_KEYS);

  if (smtpFetchErr) {
    console.error("notify-admin-contact-submission: smtp fetch", smtpFetchErr.message);
    return jsonResponse({ error: "Failed to load SMTP settings" }, 500);
  }

  const cfg: Record<string, string> = {};
  for (const row of smtpRows ?? []) {
    try {
      cfg[row.key] = await decryptSettingValue(row.encrypted_value, encryptionKey);
    } catch (e) {
      console.error(`notify-admin-contact-submission: decrypt ${row.key}:`, e instanceof Error ? e.message : e);
    }
  }

  if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_password || !cfg.smtp_from) {
    console.error("notify-admin-contact-submission: SMTP not fully configured in app_settings");
    return jsonResponse({ ok: true, skipped: "smtp_not_configured" }, 200);
  }

  const adminTo = Deno.env.get("ADMIN_NOTIFICATION_EMAIL")?.trim() || cfg.smtp_reply_to || cfg.smtp_from;
  if (!EMAIL_RE.test(adminTo)) {
    console.error("notify-admin-contact-submission: no valid admin notification recipient");
    return jsonResponse({ ok: true, skipped: "admin_email_not_configured" }, 200);
  }

  const submittedAt = new Date(submission.created_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  });
  const contactSubject = cleanText(submission.subject, submission.category);
  const subject = `New DATAEEL support message: ${contactSubject}`;
  const textBody = [
    "A new message was submitted through the DATAEEL contact form.",
    "",
    `Received: ${submittedAt} ET`,
    `Name: ${cleanText(submission.name)}`,
    `Email: ${cleanText(submission.email)}`,
    `Topic: ${cleanText(contactSubject)}`,
    submission.user_id ? `User ID: ${submission.user_id}` : "User ID: (not signed in)",
    "",
    "Message:",
    cleanText(submission.message, ""),
    "",
    `Submission ID: ${submission.id}`,
  ].join("\n");

  try {
    await smtpSendMail({
      host: cfg.smtp_host,
      port: parseInt(cfg.smtp_port || "587", 10),
      user: cfg.smtp_user,
      password: cfg.smtp_password,
      fromAddress: cfg.smtp_from,
      fromName: cfg.smtp_from_name || "DataEel",
      replyTo: EMAIL_RE.test(submission.email) ? submission.email : cfg.smtp_reply_to || "",
      to: adminTo,
      subject,
      textBody,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SMTP send failed";
    console.error("notify-admin-contact-submission: smtp", msg);
    return jsonResponse({ error: "SMTP send failed" }, 500);
  }

  return jsonResponse({ ok: true, notified: true }, 200);
});
