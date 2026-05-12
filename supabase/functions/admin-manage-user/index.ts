import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getValidatedOrigin } from "../_shared/cors.ts";

type Action =
  | "ban"
  | "unban"
  | "send_password_recovery"
  | "update_profile"
  | "set_unlimited_credits"
  | "delete_user"
  | "delete_fake_zero_credit_users";

/** auth-js validateUUID() only accepts lowercase hex; DB/PostgREST may return mixed case. */
const UUID_STRING_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RANDOM_TWO_TOKEN_NAME_RE = /^[A-Za-z]{16,32}\s+[A-Za-z]{16,32}$/;

function normalizeUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (!UUID_STRING_RE.test(s)) return null;
  return s;
}

function resolveBodyUserId(body: { userId?: unknown; user_id?: unknown; id?: unknown }): string | null {
  return normalizeUserId(body.userId) ?? normalizeUserId(body.user_id) ?? normalizeUserId(body.id);
}

function looksLikeRandomTwoTokenName(value: unknown): boolean {
  return typeof value === "string" && RANDOM_TWO_TOKEN_NAME_RE.test(value.trim());
}

function getRecoveryRedirectTo(req: Request): string | undefined {
  const origin = getValidatedOrigin(req);
  return origin ? `${origin}/account-settings` : undefined;
}

async function deleteFromTable(
  supabaseAdmin: ReturnType<typeof createClient>,
  table: string,
  column: string,
  userId: string,
) {
  const { error } = await supabaseAdmin.from(table).delete().eq(column, userId);
  if (error) throw new Error(`${table} cleanup failed: ${error.message}`);
}

async function setNullInTable(
  supabaseAdmin: ReturnType<typeof createClient>,
  table: string,
  column: string,
  userId: string,
) {
  const { error } = await supabaseAdmin.from(table).update({ [column]: null }).eq(column, userId);
  if (error) throw new Error(`${table} cleanup failed: ${error.message}`);
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
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user: actor }, error: actorErr } = await supabaseUser.auth.getUser();
    if (actorErr || !actor) return respond({ error: "Unauthorized" }, 401);

    const actorId = normalizeUserId(actor.id);
    if (!actorId) return respond({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: actorId });
    if (!isAdmin) return respond({ error: "Forbidden" }, 403);

    const body = await req.json() as {
      action: Action;
      userId?: unknown;
      user_id?: unknown;
      id?: unknown;
      full_name?: string;
      unlimited?: boolean;
    };
    const { action } = body;
    const userId = resolveBodyUserId(body);

    if (action !== "delete_fake_zero_credit_users" && !userId) {
      return respond({ error: "userId must be a valid UUID string", detail: "Expected userId, user_id, or id." }, 400);
    }

    if (userId === actorId && (action === "ban" || action === "unban")) {
      return respond({ error: "Cannot change ban state for your own account" }, 400);
    }

    if (action === "ban") {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });
      if (error) return respond({ error: error.message }, 500);
      await supabaseAdmin.from("audit_log").insert({
        actor_id: actorId,
        action: "admin.user.ban",
        resource: "auth.users",
        resource_id: userId,
        detail: {},
      });
      return respond({ ok: true });
    }

    if (action === "unban") {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
      if (error) return respond({ error: error.message }, 500);
      await supabaseAdmin.from("audit_log").insert({
        actor_id: actorId,
        action: "admin.user.unban",
        resource: "auth.users",
        resource_id: userId,
        detail: {},
      });
      return respond({ ok: true });
    }

    if (action === "send_password_recovery") {
      const { data: authUserData, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUserErr) {
        console.error("admin-manage-user send_password_recovery: auth user lookup failed", authUserErr.message);
        return respond({ error: authUserErr.message }, 500);
      }

      const { data: profile, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("user_id", userId)
        .maybeSingle();
      if (pErr) {
        console.error("admin-manage-user send_password_recovery: profile lookup failed", pErr.message);
        return respond({ error: pErr.message }, 500);
      }

      const email = authUserData.user?.email ?? profile?.email ?? null;
      if (!email) {
        return respond({ error: "Could not resolve user email" }, 400);
      }

      const redirectTo = getRecoveryRedirectTo(req);
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: redirectTo ? { redirectTo } : undefined,
      });

      if (linkErr) {
        console.error("admin-manage-user send_password_recovery: generateLink failed", linkErr.message);
        const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        if (resetErr) {
          console.error("admin-manage-user send_password_recovery: resetPasswordForEmail failed", resetErr.message);
          return respond({ error: resetErr.message }, 500);
        }

        await supabaseAdmin.from("audit_log").insert({
          actor_id: actorId,
          action: "admin.user.password_recovery_sent",
          resource: "auth.users",
          resource_id: userId,
          detail: { email, delivery_method: "email", link_error: linkErr.message },
        });
        return respond({ ok: true, recovery_link: null, delivery_method: "email" });
      }

      const recoveryLink = (linkData as { properties?: { action_link?: string } })?.properties?.action_link ?? null;
      await supabaseAdmin.from("audit_log").insert({
        actor_id: actorId,
        action: "admin.user.password_recovery_sent",
        resource: "auth.users",
        resource_id: userId,
        detail: { email, delivery_method: recoveryLink ? "link" : "unknown" },
      });
      return respond({ ok: true, recovery_link: recoveryLink });
    }

    if (action === "update_profile") {
      const full_name = body.full_name?.trim();
      if (full_name === undefined || full_name === "") {
        return respond({ error: "full_name is required" }, 400);
      }
      const { error: uErr } = await supabaseAdmin
        .from("profiles")
        .update({ full_name, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (uErr) return respond({ error: uErr.message }, 500);
      await supabaseAdmin.from("audit_log").insert({
        actor_id: actorId,
        action: "admin.profile.update",
        resource: "profiles",
        resource_id: userId,
        detail: { full_name },
      });
      return respond({ ok: true });
    }

    if (action === "set_unlimited_credits") {
      if (typeof body.unlimited !== "boolean") {
        return respond({ error: "unlimited must be a boolean" }, 400);
      }

      const { data: balance, error: balanceErr } = await supabaseAdmin
        .from("credit_balances")
        .select("credits")
        .eq("user_id", userId)
        .maybeSingle();
      if (balanceErr) return respond({ error: balanceErr.message }, 500);

      if (balance) {
        const { error } = await supabaseAdmin
          .from("credit_balances")
          .update({ unlimited_credits: body.unlimited, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        if (error) return respond({ error: error.message }, 500);
      } else {
        const { error } = await supabaseAdmin
          .from("credit_balances")
          .insert({ user_id: userId, credits: 0, unlimited_credits: body.unlimited });
        if (error) return respond({ error: error.message }, 500);
      }

      const balanceAfter = Number(balance?.credits ?? 0);
      const { error: ledgerErr } = await supabaseAdmin.from("credit_ledger").insert({
        user_id: userId,
        delta: 0,
        balance_after: balanceAfter,
        entry_type: "admin_grant",
        ref_id: null,
        meta: { admin_id: actorId, unlimited_credits: body.unlimited },
      });
      if (ledgerErr) return respond({ error: ledgerErr.message }, 500);

      await supabaseAdmin.from("audit_log").insert({
        actor_id: actorId,
        action: body.unlimited ? "admin.user.unlimited_credits.enable" : "admin.user.unlimited_credits.disable",
        resource: "credit_balances",
        resource_id: userId,
        detail: { unlimited_credits: body.unlimited },
      });

      return respond({ ok: true });
    }

    if (action === "delete_fake_zero_credit_users") {
      const { data: profiles, error: profilesErr } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, full_name");
      if (profilesErr) return respond({ error: profilesErr.message }, 500);

      const { data: balances, error: balancesErr } = await supabaseAdmin
        .from("credit_balances")
        .select("user_id, credits, unlimited_credits");
      if (balancesErr) return respond({ error: balancesErr.message }, 500);

      const { data: roles, error: rolesErr } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role");
      if (rolesErr) return respond({ error: rolesErr.message }, 500);

      const balanceByUserId = new Map(
        (balances ?? []).map((row) => [
          normalizeUserId(row.user_id),
          { credits: Number(row.credits ?? 0), unlimited: row.unlimited_credits === true },
        ]),
      );
      const adminUserIds = new Set(
        (roles ?? [])
          .filter((row) => row.role === "admin")
          .map((row) => normalizeUserId(row.user_id))
          .filter((id): id is string => Boolean(id)),
      );
      const candidates = (profiles ?? [])
        .map((profile) => ({
          user_id: normalizeUserId(profile.user_id),
          email: profile.email as string | null,
          full_name: profile.full_name as string | null,
        }))
        .filter((profile) => {
          if (!profile.user_id || profile.user_id === actorId || adminUserIds.has(profile.user_id)) return false;
          const balance = balanceByUserId.get(profile.user_id);
          return (
            looksLikeRandomTwoTokenName(profile.full_name) &&
            (balance?.credits ?? 0) === 0 &&
            balance?.unlimited !== true
          );
        });

      const deleted: string[] = [];
      const failed: { user_id: string; email: string | null; error: string }[] = [];

      for (const candidate of candidates) {
        if (!candidate.user_id) continue;
        try {
          await setNullInTable(supabaseAdmin, "racecards", "uploaded_by", candidate.user_id);
          await setNullInTable(supabaseAdmin, "contact_submissions", "user_id", candidate.user_id);
          await setNullInTable(supabaseAdmin, "audit_log", "actor_id", candidate.user_id);

          await deleteFromTable(supabaseAdmin, "racecard_downloads", "user_id", candidate.user_id);
          await deleteFromTable(supabaseAdmin, "ai_usage_daily", "user_id", candidate.user_id);
          await deleteFromTable(supabaseAdmin, "transactions", "user_id", candidate.user_id);
          await deleteFromTable(supabaseAdmin, "credit_ledger", "user_id", candidate.user_id);
          await deleteFromTable(supabaseAdmin, "credit_balances", "user_id", candidate.user_id);
          await deleteFromTable(supabaseAdmin, "user_roles", "user_id", candidate.user_id);
          await deleteFromTable(supabaseAdmin, "profiles", "user_id", candidate.user_id);

          const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(candidate.user_id);
          if (delErr) {
            const { error: softDelErr } = await supabaseAdmin.auth.admin.deleteUser(candidate.user_id, true);
            if (softDelErr) {
              const { data: forceDeleted, error: forceErr } = await supabaseAdmin.rpc("admin_force_delete_auth_user", {
                _user_id: candidate.user_id,
              });
              if (forceErr || !forceDeleted) {
                throw new Error(forceErr?.message ?? "Auth user could not be deleted");
              }
            }
          }
          deleted.push(candidate.user_id);
        } catch (e) {
          failed.push({
            user_id: candidate.user_id,
            email: candidate.email,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      await supabaseAdmin.from("audit_log").insert({
        actor_id: actorId,
        action: "admin.user.bulk_delete_fake_zero_credit",
        resource: "auth.users",
        resource_id: null,
        detail: {
          deleted_count: deleted.length,
          failed_count: failed.length,
        },
      });

      return respond({ ok: failed.length === 0, deleted_count: deleted.length, failed });
    }

    if (action === "delete_user") {
      if (!userId) {
        return respond({ error: "userId must be a valid UUID string" }, 400);
      }
      if (userId === actorId) {
        return respond({ error: "Cannot delete your own account" }, 400);
      }

      const { data: targetIsAdmin, error: adminCheckErr } = await supabaseAdmin.rpc("is_admin", {
        _user_id: userId,
      });
      if (adminCheckErr) {
        console.error("admin-manage-user delete_user: is_admin(target) failed", adminCheckErr.message);
        return respond({ error: adminCheckErr.message }, 500);
      }

      if (targetIsAdmin) {
        const { count: adminCount, error: countErr } = await supabaseAdmin
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");
        if (countErr) {
          console.error("admin-manage-user delete_user: admin count failed", countErr.message);
          return respond({ error: countErr.message }, 500);
        }
        if ((adminCount ?? 0) <= 1) {
          return respond({ error: "Cannot delete the only admin account" }, 400);
        }
      }

      const { data: profileRow } = await supabaseAdmin.from("profiles").select("email").eq("user_id", userId).maybeSingle();

      try {
        await setNullInTable(supabaseAdmin, "racecards", "uploaded_by", userId);
        await setNullInTable(supabaseAdmin, "contact_submissions", "user_id", userId);
        await setNullInTable(supabaseAdmin, "audit_log", "actor_id", userId);

        await deleteFromTable(supabaseAdmin, "racecard_downloads", "user_id", userId);
        await deleteFromTable(supabaseAdmin, "ai_usage_daily", "user_id", userId);
        await deleteFromTable(supabaseAdmin, "transactions", "user_id", userId);
        await deleteFromTable(supabaseAdmin, "credit_ledger", "user_id", userId);
        await deleteFromTable(supabaseAdmin, "credit_balances", "user_id", userId);
        await deleteFromTable(supabaseAdmin, "user_roles", "user_id", userId);
        await deleteFromTable(supabaseAdmin, "profiles", "user_id", userId);
      } catch (cleanupErr) {
        const message = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
        console.error("admin-manage-user delete_user: app data cleanup failed", message);
        return respond({ error: message }, 500);
      }

      let hardDelete = true;
      let directDelete = false;
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (delErr) {
        console.error("admin-manage-user delete_user: auth.admin.deleteUser hard delete failed", delErr.message);
        const { error: softDelErr } = await supabaseAdmin.auth.admin.deleteUser(userId, true);
        if (softDelErr) {
          console.error("admin-manage-user delete_user: auth.admin.deleteUser soft delete failed", softDelErr.message);
          const { data: forceDeleted, error: forceErr } = await supabaseAdmin.rpc("admin_force_delete_auth_user", {
            _user_id: userId,
          });
          if (forceErr) {
            console.error("admin-manage-user delete_user: direct auth delete failed", forceErr.message);
            return respond({
              error: `App data was removed, but Supabase Auth delete failed: ${forceErr.message}`,
            }, 500);
          }
          if (!forceDeleted) {
            return respond({
              error: "App data was removed, but Supabase Auth user could not be found for deletion.",
            }, 500);
          }
          directDelete = true;
        } else {
          hardDelete = false;
        }
      }

      await supabaseAdmin.from("audit_log").insert({
        actor_id: actorId,
        action: "admin.user.delete",
        resource: "auth.users",
        resource_id: userId,
        detail: { email: profileRow?.email ?? null, hard_delete: hardDelete, direct_delete: directDelete },
      });
      return respond({ ok: true, hard_delete: hardDelete, direct_delete: directDelete });
    }

    return respond({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("admin-manage-user: unhandled", msg);
    return respond({ error: msg }, 500);
  }
});
