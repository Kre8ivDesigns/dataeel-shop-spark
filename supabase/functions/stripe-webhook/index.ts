// Stripe calls this endpoint server-to-server — no CORS headers needed.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveStripeConfig } from "../_shared/stripe_config.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

Deno.serve(async (req) => {
  try {
    return await handleStripeWebhook(req);
  } catch (err) {
    console.error(
      "[stripe-webhook] Unhandled error:",
      err instanceof Error ? err.stack ?? err.message : String(err),
    );
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

async function handleStripeWebhook(req: Request): Promise<Response> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const stripeConfig = await resolveStripeConfig(supabaseAdmin);

  const secretKey = stripeConfig.secretKey.trim();
  if (!secretKey) {
    console.error("[stripe-webhook] STRIPE_SECRET_KEY (or app_settings key) not configured");
    return jsonResponse({ error: "Stripe API key not configured" }, 503);
  }

  const webhookSecret = stripeConfig.webhookSecret.trim();
  if (!webhookSecret) {
    console.error("[stripe-webhook] Webhook signing secret not configured");
    return jsonResponse({ error: "Webhook signing secret not configured" }, 503);
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse({ error: "No signature" }, 400);
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err instanceof Error ? err.message : "unknown");
    return jsonResponse({ error: "Invalid signature" }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits || "0", 10);
    const packageName = session.metadata?.package_name || "Unknown";
    const amount = (session.amount_total || 0) / 100;

    if (!userId || credits <= 0) {
      console.error("[stripe-webhook] Missing or invalid metadata");
      return jsonResponse({ error: "Invalid metadata" }, 400);
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
        return jsonResponse({ received: true, duplicate: true }, 200);
      }
      console.error("[stripe-webhook] Transaction insert failed:", txError.code, txError.message);
      return jsonResponse({ error: "Transaction recording failed" }, 500);
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
      console.error("[stripe-webhook] Credit update failed:", creditError.code, creditError.message);
      // Rollback the transaction record to allow a retry
      await supabaseAdmin.from("transactions").delete().eq("stripe_session_id", session.id);
      return jsonResponse({ error: "Credit update failed" }, 500);
    }

    const { error: auditError } = await supabaseAdmin.from("audit_log").insert({
      actor_id: null,
      action: "stripe.checkout.completed",
      resource: "credit_balance",
      resource_id: userId,
      detail: { stripe_session_id: session.id, credits, amount, package_name: packageName },
    });
    if (auditError) {
      console.error("[stripe-webhook] Audit log insert failed (non-fatal):", auditError.code, auditError.message);
    }
  }

  return jsonResponse({ received: true }, 200);
}
