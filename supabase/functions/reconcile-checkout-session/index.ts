/**
 * User-initiated repair: if Stripe Checkout succeeded but the webhook did not record
 * the purchase, re-run the same fulfillment as checkout.session.completed (idempotent).
 */
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { fulfillCheckoutSessionCompleted } from "../_shared/fulfill_checkout_session.ts";
import { jsonErrBody } from "../_shared/stripe_webhook_errors.ts";
import { resolveStripeConfig } from "../_shared/stripe_config.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const headers = { ...getCorsHeaders(req), ...JSON_HEADERS };

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim() ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
    if (!supabaseUrl || !anonKey || !serviceRole) {
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), { status: 503, headers });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    let body: { session_id?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers });
    }

    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    if (!sessionId.startsWith("cs_")) {
      return new Response(JSON.stringify({ error: "session_id must be a Stripe Checkout Session id (cs_…)" }), {
        status: 400,
        headers,
      });
    }

    let stripeConfig;
    try {
      stripeConfig = await resolveStripeConfig(supabaseAdmin);
    } catch (err) {
      console.error("[reconcile-checkout-session] resolveStripeConfig failed:", err instanceof Error ? err.message : err);
      return new Response(JSON.stringify(jsonErrBody("Stripe config resolution failed", err)), { status: 503, headers });
    }

    const secretKey = stripeConfig.secretKey.trim();
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Stripe API key not configured" }), { status: 503, headers });
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[reconcile-checkout-session] retrieve session failed:", msg);
      return new Response(JSON.stringify({ error: "Could not load Checkout Session from Stripe", detail: msg }), {
        status: 400,
        headers,
      });
    }

    const paidLike =
      session.payment_status === "paid" || session.payment_status === "no_payment_required";
    if (!paidLike) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Checkout Session is not paid yet",
          payment_status: session.payment_status,
        }),
        { status: 400, headers },
      );
    }

    const metaUserId = session.metadata?.user_id;
    if (metaUserId !== user.id) {
      return new Response(JSON.stringify({ error: "This purchase belongs to a different account" }), {
        status: 403,
        headers,
      });
    }

    const result = await fulfillCheckoutSessionCompleted(supabaseAdmin, stripe, session);

    switch (result.outcome) {
      case "fulfilled":
        return new Response(JSON.stringify({ ok: true, fulfilled: true }), { status: 200, headers });
      case "duplicate":
        return new Response(JSON.stringify({ ok: true, already_fulfilled: true }), { status: 200, headers });
      case "skipped_metadata":
        return new Response(
          JSON.stringify({ ok: false, error: "Session is missing app metadata (not a Dataeel credit checkout)" }),
          { status: 400, headers },
        );
      case "skipped_unpaid":
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Checkout Session is not paid yet",
            payment_status: result.payment_status,
          }),
          { status: 400, headers },
        );
      case "skipped_acknowledged":
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Database rejected this fulfillment",
            reason: result.reason,
          }),
          { status: 503, headers },
        );
      case "transaction_error":
        return new Response(JSON.stringify(jsonErrBody("Transaction recording failed", result.error)), {
          status: 500,
          headers,
        });
      case "fulfillment_error":
        return new Response(JSON.stringify(jsonErrBody("Credit update failed", result.error)), {
          status: 500,
          headers,
        });
    }
  } catch (err) {
    console.error("[reconcile-checkout-session] Unhandled:", err instanceof Error ? err.stack ?? err.message : err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers });
  }
});
