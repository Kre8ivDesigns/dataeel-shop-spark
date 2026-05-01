// Stripe calls this endpoint server-to-server — no CORS headers needed.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveStripeConfig } from "../_shared/stripe_config.ts";

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const stripeConfig = await resolveStripeConfig(supabaseAdmin);
  const stripe = new Stripe(stripeConfig.secretKey, {
    apiVersion: "2025-08-27.basil",
  });

  const webhookSecret = stripeConfig.webhookSecret;
  if (!webhookSecret) {
    console.error("[stripe-webhook] Webhook signing secret not configured");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "No signature" }), { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err instanceof Error ? err.message : "unknown");
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits || "0", 10);
    const packageName = session.metadata?.package_name || "Unknown";
    const amount = (session.amount_total || 0) / 100;

    if (!userId || credits <= 0) {
      console.error("[stripe-webhook] Missing or invalid metadata");
      return new Response(JSON.stringify({ error: "Invalid metadata" }), { status: 400 });
    }

    // IDEMPOTENCY: insert transaction first with unique stripe_session_id.
    // If the event was already processed, the unique constraint will reject it.
    const { data: insertedTx, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId,
        stripe_session_id: session.id,
        amount,
        credits,
        package_name: packageName,
        status: "completed",
      })
      .select("id")
      .single();

    if (txError) {
      if (txError.code === "23505") {
        // Duplicate — already processed. Return 200 to stop Stripe retries.
        console.log("[stripe-webhook] Duplicate event ignored:", session.id);
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
      }
      console.error("[stripe-webhook] Transaction insert failed:", txError.code);
      return new Response(JSON.stringify({ error: "Transaction recording failed" }), { status: 500 });
    }

    // Atomic credit update — no read-then-write race condition (CRIT-04)
    const { error: creditError } = await supabaseAdmin.rpc("add_credits_atomic", {
      p_user_id: userId,
      p_credits: credits,
      p_entry_type: "purchase",
      p_ref_id: insertedTx?.id ?? null,
      p_meta: {
        stripe_session_id: session.id,
        package_name: packageName,
        amount,
      },
    });

    if (creditError) {
      console.error("[stripe-webhook] Credit update failed:", creditError.code);
      // Rollback the transaction record to allow a retry
      await supabaseAdmin.from("transactions").delete().eq("stripe_session_id", session.id);
      return new Response(JSON.stringify({ error: "Credit update failed" }), { status: 500 });
    }

    // Audit log
    await supabaseAdmin.from("audit_log").insert({
      actor_id: null,
      action: "stripe.checkout.completed",
      resource: "credit_balance",
      resource_id: userId,
      detail: { stripe_session_id: session.id, credits, amount, package_name: packageName },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
