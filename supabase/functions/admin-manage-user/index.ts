import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

type Action = "ban" | "unban" | "send_password_recovery" | "update_profile" | "delete_user";

/** auth-js validateUUID() only accepts lowercase hex; DB/PostgREST may return mixed case. */
const UUID_STRING_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (!UUID_STRING_RE.test(s)) return null;
  return s;
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
      userId?: string;
      full_name?: string;
    };
    const { action } = body;
    const userId = normalizeUserId(body.userId);

    if (!userId) {
      return respond({ error: "userId must be a valid UUID string" }, 400);
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
      const { data: profile, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("user_id", userId)
        .maybeSingle();
      if (pErr || !profile?.email) {
        return respond({ error: "Could not resolve user email" }, 400);
      }
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: profile.email,
      });
      if (linkErr) return respond({ error: linkErr.message }, 500);
      const recoveryLink = (linkData as { properties?: { action_link?: string } })?.properties?.action_link ?? null;
      await supabaseAdmin.from("audit_log").insert({
        actor_id: actorId,
        action: "admin.user.password_recovery_sent",
        resource: "auth.users",
        resource_id: userId,
        detail: { email: profile.email },
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

    if (action === "delete_user") {
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
