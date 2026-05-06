import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { WP_MEMBERS_IMPORT_PAYLOAD, type WpMemberImportMember } from "../_shared/wp_members_import_payload.ts";

type AuthUser = {
  id: string;
};

type ImportError = {
  email: string;
  old_wp_user_id: number;
  error: string;
};

type ImportSummary = {
  dryRun: boolean;
  payloadMembers: number;
  createdAuthUsers: number;
  wouldCreateAuthUsers: number;
  skippedExistingOriginalEmails: number;
  upsertedPublicMembers: number;
  insertedCreditLedgerRows: number;
  errors: ImportError[];
};

const UUID_STRING_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (!UUID_STRING_RE.test(s)) return null;
  return s;
}

function lowerEmail(email: string): string {
  return email.trim().toLowerCase();
}

function randomPassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const encoded = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${crypto.randomUUID()}-${encoded}`;
}

function memberMetadata(member: WpMemberImportMember): Record<string, unknown> {
  return {
    full_name: member.full_name,
    wp_user_id: member.old_wp_user_id,
    wp_login: member.wp_login,
    wp_roles: member.wp_roles,
    wp_registered_at: member.wp_registered_at,
    wpdm_current_credits: member.current_credits,
    wpdm_completed_order_count: member.completed_order_count,
    wpdm_completed_order_total: member.completed_order_total,
    wpdm_last_completed_order_at: member.last_completed_order_at,
    wpdm_credit_history_buy_total: member.credit_history_buy_total,
    wpdm_credit_history_spent_total: member.credit_history_spent_total,
    wpdm_credit_history_row_count: member.credit_history_row_count,
    migration_source: "wordpress_import",
  };
}

function getFirstKeyFromJsonDictionary(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.values(parsed).find((value): value is string => typeof value === "string" && value.trim() !== "") ?? null;
  } catch {
    return null;
  }
}

function getSupabasePublishableKey(): string {
  const legacy = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  if (legacy) return legacy;

  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")?.trim();
  const key = raw ? getFirstKeyFromJsonDictionary(raw) : null;
  if (key) return key;

  throw new Error("Missing Supabase publishable/anon key");
}

function getSupabaseSecretKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (legacy) return legacy;

  const raw = Deno.env.get("SUPABASE_SECRET_KEYS")?.trim();
  const key = raw ? getFirstKeyFromJsonDictionary(raw) : null;
  if (key) return key;

  throw new Error("Missing Supabase secret/service-role key");
}

function isExistingAuthUserError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("already exists") ||
    normalized.includes("user already") ||
    normalized.includes("email_exists") ||
    normalized.includes("email exists") ||
    normalized.includes("duplicate key")
  );
}

async function createAuthUser(
  supabaseAdmin: ReturnType<typeof createClient>,
  member: WpMemberImportMember,
): Promise<AuthUser> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: lowerEmail(member.email),
    password: randomPassword(),
    email_confirm: true,
    user_metadata: memberMetadata(member),
  });

  if (error) throw new Error(`Auth create failed: ${error.message}`);
  if (!data?.user?.id) throw new Error("Auth create returned no user id");
  return data.user as AuthUser;
}

async function upsertPublicMember(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  member: WpMemberImportMember,
): Promise<{ ledgerInserted: boolean }> {
  const now = new Date().toISOString();
  const email = lowerEmail(member.email);

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      user_id: userId,
      email,
      full_name: member.full_name || null,
      created_at: member.wp_registered_at,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (profileError) throw new Error(`profiles upsert failed: ${profileError.message}`);

  const { error: roleError } = await supabaseAdmin.from("user_roles").upsert(
    { user_id: userId, role: "user" },
    { onConflict: "user_id,role" },
  );
  if (roleError) throw new Error(`user_roles upsert failed: ${roleError.message}`);

  const { error: balanceError } = await supabaseAdmin.from("credit_balances").upsert(
    {
      user_id: userId,
      credits: member.current_credits,
      unlimited_credits: false,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (balanceError) throw new Error(`credit_balances upsert failed: ${balanceError.message}`);

  if (member.current_credits === 0) {
    return { ledgerInserted: false };
  }

  const { data: existingLedger, error: ledgerReadError } = await supabaseAdmin
    .from("credit_ledger")
    .select("id")
    .eq("user_id", userId)
    .eq("entry_type", "adjustment")
    .contains("meta", { source: "wordpress_import", old_wp_user_id: member.old_wp_user_id })
    .limit(1);
  if (ledgerReadError) throw new Error(`credit_ledger read failed: ${ledgerReadError.message}`);
  if ((existingLedger ?? []).length > 0) {
    return { ledgerInserted: false };
  }

  const { error: ledgerInsertError } = await supabaseAdmin.from("credit_ledger").insert({
    user_id: userId,
    delta: member.current_credits,
    balance_after: member.current_credits,
    entry_type: "adjustment",
    ref_id: null,
    meta: {
      source: "wordpress_import",
      old_wp_user_id: member.old_wp_user_id,
      credit_source: "y5TdXhID_usermeta.prepaid_credits",
      wpdm_credit_history_buy_total: member.credit_history_buy_total,
      wpdm_credit_history_spent_total: member.credit_history_spent_total,
      wpdm_credit_history_row_count: member.credit_history_row_count,
    },
    created_at: now,
  });
  if (ledgerInsertError) throw new Error(`credit_ledger insert failed: ${ledgerInsertError.message}`);

  return { ledgerInserted: true };
}

function createSummary(dryRun: boolean): ImportSummary {
  return {
    dryRun,
    payloadMembers: WP_MEMBERS_IMPORT_PAYLOAD.members.length,
    createdAuthUsers: 0,
    wouldCreateAuthUsers: 0,
    skippedExistingOriginalEmails: 0,
    upsertedPublicMembers: 0,
    insertedCreditLedgerRows: 0,
    errors: [],
  };
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      getSupabasePublishableKey(),
      { global: { headers: { Authorization: authHeader } } },
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      getSupabaseSecretKey(),
    );

    const { data: { user: actor }, error: actorErr } = await supabaseUser.auth.getUser();
    if (actorErr || !actor) return respond({ error: "Unauthorized" }, 401);

    const actorId = normalizeUserId(actor.id);
    if (!actorId) return respond({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: actorId });
    if (!isAdmin) return respond({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({})) as { dryRun?: boolean };
    const dryRun = body.dryRun === true;
    const summary = createSummary(dryRun);

    for (const member of WP_MEMBERS_IMPORT_PAYLOAD.members) {
      const email = lowerEmail(member.email);

      try {
        if (dryRun) {
          summary.wouldCreateAuthUsers += 1;
          continue;
        }

        const user = await createAuthUser(supabaseAdmin, member);
        summary.createdAuthUsers += 1;

        if (!user?.id) throw new Error("No Auth user id available for public table import");

        const result = await upsertPublicMember(supabaseAdmin, user.id, member);
        summary.upsertedPublicMembers += 1;
        if (result.ledgerInserted) summary.insertedCreditLedgerRows += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isExistingAuthUserError(message)) {
          summary.skippedExistingOriginalEmails += 1;
          continue;
        }
        summary.errors.push({ email, old_wp_user_id: member.old_wp_user_id, error: message });
      }
    }

    if (!dryRun) {
      const { error: auditError } = await supabaseAdmin.from("audit_log").insert({
        actor_id: actorId,
        action: "admin.wordpress_members.import",
        resource: "wordpress_dump",
        resource_id: null,
        detail: summary,
      });
      if (auditError) console.error("import-wp-members audit insert failed", auditError.message);
    }

    if (summary.errors.length > 0) {
      return respond({ error: "WordPress member import completed with errors", summary }, 200);
    }

    return respond({ ok: true, sourceCounts: WP_MEMBERS_IMPORT_PAYLOAD.counts, summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("import-wp-members: unhandled", msg);
    return respond({ error: msg }, 500);
  }
});
