/**
 * Stripe webhook (server-to-server).
 *
 * Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET (or app_settings + APP_SETTINGS_ENCRYPTION_KEY).
 * Optional env on this function: WEBHOOK_EXPOSE_ERRORS=true — 5xx JSON includes `message`,
 *   `postgres_code`, `postgres_detail`, `postgres_hint` (PostgREST/Postgres errors).
 */
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fulfillCheckoutSessionCompleted } from "../_shared/fulfill_checkout_session.ts";
import { acknowledgeOnlyDbError, jsonErrBody } from "../_shared/stripe_webhook_errors.ts";
import { resolveStripeConfig } from "../_shared/stripe_config.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function paymentIntentIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const pi = invoice.payment_intent;
  if (typeof pi === "string") return pi;
  if (pi && typeof pi === "object" && "id" in pi) return pi.id;
  return null;
}

Deno.serve(async (req) => {
  try {
    return await handleStripeWebhook(req);
  } catch (err) {
    console.error(
      "[stripe-webhook] Unhandled error:",
      err instanceof Error ? err.stack ?? err.message : String(err),
    );
    return jsonResponse(jsonErrBody("Internal error", err), 500);
  }
});

async function handleStripeWebhook(req: Request): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  if (!supabaseUrl || !serviceRole) {
    console.error("[stripe-webhook] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return jsonResponse({ error: "Server misconfiguration" }, 503);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false },
  });

  let stripeConfig;
  try {
    stripeConfig = await resolveStripeConfig(supabaseAdmin);
  } catch (err) {
    console.error("[stripe-webhook] resolveStripeConfig failed:", err instanceof Error ? err.message : err);
    return jsonResponse(jsonErrBody("Stripe config resolution failed", err), 503);
  }

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

  const checkoutSessionEvents = new Set([
    "checkout.session.completed",
    // Deferred payment methods (e.g. some wallets / regional methods): completed may be unpaid until this fires.
    "checkout.session.async_payment_succeeded",
  ]);

  if (checkoutSessionEvents.has(event.type)) {
    const sessionObj = event.data.object as Stripe.Checkout.Session;
    const isUnlimitedMeta = sessionObj.metadata?.unlimited_credits === "true";
    const result = await fulfillCheckoutSessionCompleted(supabaseAdmin, stripe, sessionObj);
    switch (result.outcome) {
      case "fulfilled":
        break;
      case "duplicate":
        return jsonResponse({ received: true, duplicate: true }, 200);
      case "skipped_metadata":
        return jsonResponse({ received: true, skipped: true }, 200);
      case "skipped_unpaid":
        return jsonResponse(
          { received: true, skipped: true, reason: "payment_not_final", payment_status: result.payment_status },
          200,
        );
      case "skipped_acknowledged":
        return jsonResponse({ received: true, skipped: true, reason: result.reason }, 200);
      case "transaction_error":
        return jsonResponse(jsonErrBody("Transaction recording failed", result.error), 500);
      case "fulfillment_error":
        return jsonResponse(
          jsonErrBody(isUnlimitedMeta ? "Unlimited grant failed" : "Credit update failed", result.error),
          500,
        );
    }
  }

  // Subscription invoices / unrelated billing — skip.
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.subscription) {
      return jsonResponse({ received: true, skipped: "subscription_invoice" }, 200);
    }

    const paymentIntentId = paymentIntentIdFromInvoice(invoice);
    if (!paymentIntentId) {
      return jsonResponse({ received: true, skipped: "no_payment_intent" }, 200);
    }

    let inv = invoice;
    if (!inv.lines?.data?.length) {
      try {
        inv = await stripe.invoices.retrieve(invoice.id, { expand: ["lines.data.price"] });
      } catch (e) {
        console.error("[stripe-webhook] invoice retrieve failed:", e instanceof Error ? e.message : e);
        return jsonResponse({ received: true, skipped: "invoice_expand_failed" }, 200);
      }
    }

    let userId = inv.metadata?.user_id ?? undefined;
    let credits = parseInt(inv.metadata?.credits || "0", 10);
    let packageName = inv.metadata?.package_name || "Credit purchase";
    let isUnlimited = inv.metadata?.unlimited_credits === "true";

    const customerId =
      typeof inv.customer === "string" ? inv.customer : inv.customer && typeof inv.customer === "object"
        ? inv.customer.id
        : null;

    if (!userId && customerId) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      userId = prof?.user_id ?? undefined;
    }

    if (credits <= 0 && inv.lines?.data?.length) {
      const line = inv.lines.data[0];
      const priceObj = line.price;
      const priceId =
        typeof priceObj === "string"
          ? priceObj
          : priceObj && typeof priceObj === "object" && "id" in priceObj
            ? (priceObj as Stripe.Price).id
            : null;
      if (priceId) {
        const { data: pkg } = await supabaseAdmin
          .from("credit_packages")
          .select("credits, name, unlimited_credits")
          .eq("stripe_price_id", priceId)
          .maybeSingle();
        if (pkg) {
          packageName = pkg.name;
          if (pkg.unlimited_credits) {
            isUnlimited = true;
            credits = 0;
          } else {
            credits = pkg.credits;
          }
        }
      }
    }

    if (!userId || (!isUnlimited && credits <= 0)) {
      console.log(
        "[stripe-webhook] invoice.paid skipped (no user/credits); invoice=",
        inv.id,
      );
      return jsonResponse({ received: true, skipped: true }, 200);
    }

    const amount = (inv.amount_paid ?? 0) / 100;

    const { data: insertedTx, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId,
        stripe_session_id: null,
        stripe_payment_intent_id: paymentIntentId,
        amount,
        credits: isUnlimited ? 0 : credits,
        package_name: packageName,
        status: "completed",
        unlimited_credits: isUnlimited,
      })
      .select("id")
      .single();

    if (txError) {
      if (txError.code === "23505") {
        console.log("[stripe-webhook] invoice.paid duplicate (same payment_intent):", paymentIntentId);
        return jsonResponse({ received: true, duplicate: true }, 200);
      }
      const ack = acknowledgeOnlyDbError(txError);
      if (ack.acknowledge) {
        console.error(
          "[stripe-webhook] invoice.paid: transaction insert skipped (non-retryable):",
          ack.reason,
          txError.code,
          txError.message,
        );
        return jsonResponse({ received: true, skipped: true, reason: ack.reason }, 200);
      }
      console.error("[stripe-webhook] invoice.paid transaction insert failed:", txError.code, txError.message);
      return jsonResponse(jsonErrBody("Transaction recording failed", txError), 500);
    }

    const invoicePurchaseMeta = {
      stripe_invoice_id: inv.id,
      stripe_payment_intent_id: paymentIntentId,
      package_name: packageName,
      amount,
    };

    if (isUnlimited) {
      const { error: grantError } = await supabaseAdmin.rpc("grant_unlimited_credits_atomic", {
        p_user_id: userId,
        p_ref_id: insertedTx?.id ?? null,
        p_meta: { ...invoicePurchaseMeta, unlimited_credits: true },
      });

      if (grantError) {
        const ack = acknowledgeOnlyDbError(grantError);
        await supabaseAdmin.from("transactions").delete().eq("stripe_payment_intent_id", paymentIntentId);
        if (ack.acknowledge) {
          console.error(
            "[stripe-webhook] invoice.paid: unlimited grant skipped (non-retryable):",
            ack.reason,
            grantError.code,
            grantError.message,
          );
          return jsonResponse({ received: true, skipped: true, reason: ack.reason }, 200);
        }
        console.error("[stripe-webhook] invoice.paid unlimited grant failed:", grantError.code, grantError.message);
        return jsonResponse(jsonErrBody("Unlimited grant failed", grantError), 500);
      }
    } else {
      const { error: creditError } = await supabaseAdmin.rpc("add_credits_atomic", {
        p_user_id: userId,
        p_credits: credits,
        p_entry_type: "purchase",
        p_ref_id: insertedTx?.id ?? null,
        p_meta: invoicePurchaseMeta,
      });

      if (creditError) {
        const ack = acknowledgeOnlyDbError(creditError);
        await supabaseAdmin.from("transactions").delete().eq("stripe_payment_intent_id", paymentIntentId);
        if (ack.acknowledge) {
          console.error(
            "[stripe-webhook] invoice.paid: credits skipped (non-retryable):",
            ack.reason,
            creditError.code,
            creditError.message,
          );
          return jsonResponse({ received: true, skipped: true, reason: ack.reason }, 200);
        }
        console.error("[stripe-webhook] invoice.paid credit update failed:", creditError.code, creditError.message);
        return jsonResponse(jsonErrBody("Credit update failed", creditError), 500);
      }
    }

    const { error: auditError } = await supabaseAdmin.from("audit_log").insert({
      actor_id: null,
      action: "stripe.invoice.paid",
      resource: "credit_balance",
      resource_id: userId,
      detail: {
        stripe_invoice_id: inv.id,
        credits: isUnlimited ? 0 : credits,
        amount,
        package_name: packageName,
        unlimited_credits: isUnlimited,
      },
    });
    if (auditError) {
      console.error("[stripe-webhook] invoice.paid audit log failed (non-fatal):", auditError.code, auditError.message);
    }
  }

  return jsonResponse({ received: true }, 200);
}
