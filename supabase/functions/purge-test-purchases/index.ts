/**
 * Removes Stripe Checkout purchase rows for the authenticated user only and reverses
 * the associated credits (same adjustment pattern as webhook rollback / ledger).
 *
 * Gates (must pass one):
 * - Resolved Stripe secret key starts with `sk_test_`, OR
 * - Supabase secret `ALLOW_TEST_DATA_PURGE=true` (escape hatch; use only if you know
 *   the risk)
 *
 * Refuses when the active key is live (`sk_live_`) unless `ALLOW_TEST_DATA_PURGE` is set.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { resolveStripeConfig } from "../_shared/stripe_config.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const stripeConfig = await resolveStripeConfig(supabaseAdmin);
    const secret = stripeConfig.secretKey.trim();
    if (!secret) {
      return new Response(
        JSON.stringify({
          error: "Stripe is not configured",
          detail: "Add test keys in Admin → Settings or Edge secrets STRIPE_SECRET_KEY.",
        }),
        { status: 503, headers },
      );
    }

    const allowPurgeFlag = Deno.env.get("ALLOW_TEST_DATA_PURGE") === "true";
    const isTestKey = secret.startsWith("sk_test_");

    // Non-test keys require explicit ALLOW_TEST_DATA_PURGE (escape hatch for staging).
    if (!isTestKey && !allowPurgeFlag) {
      return new Response(
        JSON.stringify({
          error: "Purge only allowed for Stripe test keys",
          detail:
            "Use sk_test_… in Admin → Settings or STRIPE_SECRET_KEY, or set ALLOW_TEST_DATA_PURGE=true only in controlled environments.",
        }),
        { status: 403, headers },
      );
    }

    // Simple server-side rate limit: one successful purge per user per minute
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: recentPurges, error: rateError } = await supabaseAdmin
      .from("audit_log")
      .select("*", { count: "exact", head: true })
      .eq("action", "user.purge_test_purchases")
      .eq("resource_id", user.id)
      .gte("created_at", oneMinuteAgo);

    if (!rateError && (recentPurges ?? 0) > 0) {
      return new Response(
        JSON.stringify({
          error: "Too many requests",
          detail: "Wait at least one minute between purge attempts.",
        }),
        { status: 429, headers },
      );
    }

    const { data: txs, error: txFetchErr } = await supabaseAdmin
      .from("transactions")
      .select("id, credits, stripe_session_id")
      .eq("user_id", user.id)
      .not("stripe_session_id", "is", null);

    if (txFetchErr) {
      console.error("[purge-test-purchases] list failed:", txFetchErr);
      return new Response(JSON.stringify({ error: "Failed to read transactions" }), { status: 500, headers });
    }

    if (!txs?.length) {
      return new Response(
        JSON.stringify({ ok: true, removed: 0, credits_reversed: 0, message: "No Stripe checkout purchases to remove." }),
        { status: 200, headers },
      );
    }

    const totalFromTxs = txs.reduce((s, t) => s + Number(t.credits), 0);
    const txIds = txs.map((t) => t.id);

    const { data: balRow } = await supabaseAdmin
      .from("credit_balances")
      .select("credits")
      .eq("user_id", user.id)
      .maybeSingle();
    const currentBalance = balRow?.credits ?? 0;
    const creditsToDeduct = Math.min(totalFromTxs, Math.max(0, currentBalance));

    if (creditsToDeduct > 0) {
      const { error: creditError } = await supabaseAdmin.rpc("add_credits_atomic", {
        p_user_id: user.id,
        p_credits: -creditsToDeduct,
        p_entry_type: "adjustment",
        p_ref_id: null,
        p_meta: {
          reason: "test_purchase_purge",
          transaction_ids: txIds,
          original_sum: totalFromTxs,
        },
      });
      if (creditError) {
        console.error("[purge-test-purchases] credit reversal failed:", creditError);
        return new Response(JSON.stringify({ error: "Could not adjust credit balance" }), { status: 500, headers });
      }
    }

    const { error: delError } = await supabaseAdmin.from("transactions").delete().in("id", txIds);
    if (delError) {
      console.error("[purge-test-purchases] delete failed:", delError);
      if (creditsToDeduct > 0) {
        await supabaseAdmin.rpc("add_credits_atomic", {
          p_user_id: user.id,
          p_credits: creditsToDeduct,
          p_entry_type: "adjustment",
          p_ref_id: null,
          p_meta: { reason: "test_purchase_purge_rollback", transaction_ids: txIds },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to remove purchase records" }), { status: 500, headers });
    }

    await supabaseAdmin.from("audit_log").insert({
      actor_id: user.id,
      action: "user.purge_test_purchases",
      resource: "transactions",
      resource_id: user.id,
      detail: {
        removed: txs.length,
        credits_reversed: creditsToDeduct,
        stripe_mode: isTestKey ? "test" : "non_test_with_override",
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        removed: txs.length,
        credits_reversed: creditsToDeduct,
        credits_unreconciled: totalFromTxs - creditsToDeduct,
        message:
          creditsToDeduct < totalFromTxs
            ? "Some credits were already spent; only the remaining balance was reduced."
            : "Test purchase records removed and credits reversed.",
      }),
      { status: 200, headers },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[purge-test-purchases]", msg);
    return new Response(JSON.stringify({ error: msg.slice(0, 280) }), { status: 500, headers });
  }
});
