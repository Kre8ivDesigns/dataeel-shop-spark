#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const payloadPath = path.join(repoRoot, "database", "wp_members_auth_import.json");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const continueOnError = args.has("--continue-on-error");

function usage() {
  return [
    "Usage:",
    "  SUPABASE_URL=https://<project-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/import-wp-members-auth.mjs",
    "",
    "Options:",
    "  --dry-run             Show what would happen without writing Auth or public data.",
    "  --continue-on-error   Continue importing later members after a per-member failure.",
  ].join("\n");
}

function getRequiredEnv(name, fallbackName) {
  const fallbackValue = fallbackName ? process.env[fallbackName]?.trim() : "";
  const value = process.env[name]?.trim() || fallbackValue;
  if (!value) {
    throw new Error(`Missing required env: ${name}${fallbackName ? ` or ${fallbackName}` : ""}\n\n${usage()}`);
  }
  return value;
}

function lowerEmail(email) {
  return String(email).trim().toLowerCase();
}

function randomPassword() {
  return `${randomUUID()}-${randomBytes(32).toString("base64url")}`;
}

function memberMetadata(member) {
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

function userMetadata(user) {
  return user?.user_metadata ?? user?.raw_user_meta_data ?? {};
}

function wpUserIdFor(user) {
  const value = userMetadata(user)?.wp_user_id;
  return value === undefined || value === null ? null : String(value);
}

async function loadPayload() {
  const raw = await readFile(payloadPath, "utf8");
  const payload = JSON.parse(raw);
  if (!Array.isArray(payload.members)) {
    throw new Error(`Invalid payload: ${payloadPath} does not contain a members array`);
  }
  return payload;
}

async function listAuthUsers(supabase) {
  const allUsers = [];
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to list Auth users: ${error.message}`);

    const users = data?.users ?? [];
    allUsers.push(...users);
    if (users.length < perPage) break;
  }

  return allUsers;
}

async function createAuthUser(supabase, member) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: lowerEmail(member.email),
    password: randomPassword(),
    email_confirm: true,
    user_metadata: memberMetadata(member),
  });

  if (error) throw new Error(`Auth create failed: ${error.message}`);
  if (!data?.user?.id) throw new Error("Auth create returned no user id");
  return data.user;
}

async function updateAuthMetadata(supabase, user, member) {
  const metadata = { ...userMetadata(user), ...memberMetadata(member) };
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: metadata,
  });
  if (error) throw new Error(`Auth metadata update failed: ${error.message}`);
}

async function upsertPublicMember(supabase, userId, member) {
  const now = new Date().toISOString();
  const email = lowerEmail(member.email);

  const { error: profileError } = await supabase.from("profiles").upsert(
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

  const { error: roleError } = await supabase.from("user_roles").upsert(
    { user_id: userId, role: "user" },
    { onConflict: "user_id,role" },
  );
  if (roleError) throw new Error(`user_roles upsert failed: ${roleError.message}`);

  const { error: balanceError } = await supabase.from("credit_balances").upsert(
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

  const { data: existingLedger, error: ledgerReadError } = await supabase
    .from("credit_ledger")
    .select("id")
    .eq("user_id", userId)
    .eq("entry_type", "adjustment")
    .contains("meta", { source: "wordpress_import" })
    .limit(1);
  if (ledgerReadError) throw new Error(`credit_ledger read failed: ${ledgerReadError.message}`);
  if ((existingLedger ?? []).length > 0) {
    return { ledgerInserted: false };
  }

  const { error: ledgerInsertError } = await supabase.from("credit_ledger").insert({
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

async function main() {
  if (args.has("--help") || args.has("-h")) {
    console.log(usage());
    return;
  }

  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const serviceKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
  const payload = await loadPayload();

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const authUsers = await listAuthUsers(supabase);
  const authByEmail = new Map(authUsers.filter((user) => user.email).map((user) => [lowerEmail(user.email), user]));

  const summary = {
    dryRun,
    payloadMembers: payload.members.length,
    createdAuthUsers: 0,
    wouldCreateAuthUsers: 0,
    reusedPreviousImportAuthUsers: 0,
    skippedExistingOriginalEmails: 0,
    skippedExistingDifferentWpUsers: 0,
    upsertedPublicMembers: 0,
    insertedCreditLedgerRows: 0,
    errors: [],
  };

  for (const [index, member] of payload.members.entries()) {
    const email = lowerEmail(member.email);

    try {
      const existingUser = authByEmail.get(email);
      let user = existingUser;

      if (existingUser) {
        const existingWpUserId = wpUserIdFor(existingUser);
        if (!existingWpUserId) {
          summary.skippedExistingOriginalEmails += 1;
          continue;
        }
        if (existingWpUserId !== String(member.old_wp_user_id)) {
          summary.skippedExistingDifferentWpUsers += 1;
          continue;
        }

        summary.reusedPreviousImportAuthUsers += 1;
        if (!dryRun) await updateAuthMetadata(supabase, existingUser, member);
      } else if (dryRun) {
        summary.wouldCreateAuthUsers += 1;
        continue;
      } else {
        user = await createAuthUser(supabase, member);
        authByEmail.set(email, user);
        summary.createdAuthUsers += 1;
      }

      if (!user?.id) throw new Error("No Auth user id available for public table import");

      if (!dryRun) {
        const result = await upsertPublicMember(supabase, user.id, member);
        summary.upsertedPublicMembers += 1;
        if (result.ledgerInserted) summary.insertedCreditLedgerRows += 1;
      }

      if ((index + 1) % 25 === 0) {
        console.log(`Processed ${index + 1}/${payload.members.length} payload members...`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.errors.push({ email, old_wp_user_id: member.old_wp_user_id, error: message });
      console.error(`Failed ${email}: ${message}`);
      if (!continueOnError) break;
    }
  }

  console.log(JSON.stringify(summary, null, 2));

  if (summary.errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
