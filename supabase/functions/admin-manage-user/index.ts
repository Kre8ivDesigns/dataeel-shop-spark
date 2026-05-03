import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

type Action = "ban" | "unban" | "send_password_recovery" | "update_profile" | "delete_user";

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

    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: actor.id });
    if (!isAdmin) return respond({ error: "Forbidden" }, 403);

    const body = await req.json() as {
      action: Action;
      userId?: string;
      full_name?: string;
    };
    const { action, userId } = body;

    if (!userId || typeof userId !== "string") {
      return respond({ error: "userId is required" }, 400);
    }

    if (userId === actor.id && (action === "ban" || action === "unban")) {
      return respond({ error: "Cannot change ban state for your own account" }, 400);
    }

    if (action === "ban") {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });
      if (error) return respond({ error: error.message }, 500);
      await supabaseAdmin.from("audit_log").insert({
        actor_id: actor.id,
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
        actor_id: actor.id,
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
        actor_id: actor.id,
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
        actor_id: actor.id,
        action: "admin.profile.update",
        resource: "profiles",
        resource_id: userId,
        detail: { full_name },
      });
      return respond({ ok: true });
    }

    if (action === "delete_user") {
      if (userId === actor.id) {
        return respond({ error: "Cannot delete your own account" }, 400);
      }

      const { data: targetIsAdmin, error: adminCheckErr } = await supabaseAdmin.rpc("is_admin", {
        _user_id: userId,
      });
      if (adminCheckErr) return respond({ error: adminCheckErr.message }, 500);

      if (targetIsAdmin) {
        const { count: adminCount, error: countErr } = await supabaseAdmin
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");
        if (countErr) return respond({ error: countErr.message }, 500);
        if ((adminCount ?? 0) <= 1) {
          return respond({ error: "Cannot delete the only admin account" }, 400);
        }
      }

      const { data: profileRow } = await supabaseAdmin.from("profiles").select("email").eq("user_id", userId).maybeSingle();

      const { error: rcErr } = await supabaseAdmin.from("racecards").update({ uploaded_by: null }).eq("uploaded_by", userId);
      if (rcErr) return respond({ error: rcErr.message }, 500);

      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (delErr) return respond({ error: delErr.message }, 500);

      await supabaseAdmin.from("audit_log").insert({
        actor_id: actor.id,
        action: "admin.user.delete",
        resource: "auth.users",
        resource_id: userId,
        detail: { email: profileRow?.email ?? null, hard_delete: true },
      });
      return respond({ ok: true });
    }

    return respond({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return respond({ error: msg }, 500);
  }
});
