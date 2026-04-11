import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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

    const { email, password } = await req.json() as { email?: string; password?: string };

    if (!email || !password) {
      return respond({ error: "Missing email or password" }, 400);
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return respond({ error: error.message }, 500);
    }

    await supabaseAdmin.from("audit_log").insert({
      actor_id: actor.id,
      action: "admin.user.create",
      resource: "auth.users",
      resource_id: data.user?.id ?? null,
      detail: { email },
    });

    return respond(data, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return respond({ error: msg }, 500);
  }
});
