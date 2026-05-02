/**
 * Shared fulfillment for Stripe Checkout sessions (credit packages).
 * Used by stripe-webhook (checkout.session.completed) and reconcile-checkout-session.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { acknowledgeOnlyDbError } from "./stripe_webhook_errors.ts";

export function paymentIntentIdFromSession(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (typeof pi === "string") return pi;
  if (pi && typeof pi === "object" && "id" in pi) return pi.id;
  return null;
}

export type FulfillCheckoutCompletedOutcome =
  | { outcome: "fulfilled" }
  | { outcome: "duplicate" }
  | { outcome: "skipped_metadata" }
  | { outcome: "skipped_acknowledged"; reason: string }
  | { outcome: "transaction_error"; error: unknown }
  | { outcome: "fulfillment_error"; error: unknown };

/**
 * Ensures payment intent is expanded, then records the transaction and grants credits / unlimited.
 * Idempotent: duplicate stripe_session_id returns duplicate outcome (no second grant).
 */
export async function fulfillCheckoutSessionCompleted(
  supabaseAdmin: SupabaseClient,
  stripe: Stripe,
  sessionIn: Stripe.Checkout.Session,
): Promise<FulfillCheckoutCompletedOutcome> {
  let session = sessionIn;
  if (!paymentIntentIdFromSession(session)) {
    try {
      session = await stripe.checkout.sessions.retrieve(session.id, { expand: ["payment_intent"] });
    } catch (e) {
      console.error("[fulfillCheckoutSessionCompleted] session retrieve failed:", e instanceof Error ? e.message : e);
    }
  }

  const paymentIntentId = paymentIntentIdFromSession(session);
  const userId = session.metadata?.user_id;
  const isUnlimited = session.metadata?.unlimited_credits === "true";
  const credits = parseInt(session.metadata?.credits || "0", 10);
  const packageName = session.metadata?.package_name || "Unknown";
  const amount = (session.amount_total || 0) / 100;

  if (!userId || (!isUnlimited && credits <= 0)) {
    console.error(
      "[fulfillCheckoutSessionCompleted] missing or invalid metadata, session=",
      session.id,
    );
    return { outcome: "skipped_metadata" };
  }

  const { data: insertedTx, error: txError } = await supabaseAdmin
    .from("transactions")
    .insert({
      user_id: userId,
      stripe_session_id: session.id,
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
      console.log("[fulfillCheckoutSessionCompleted] duplicate session:", session.id, paymentIntentId ?? "");
      return { outcome: "duplicate" };
    }
    const ack = acknowledgeOnlyDbError(txError);
    if (ack.acknowledge) {
      console.error(
        "[fulfillCheckoutSessionCompleted] transaction insert skipped:",
        ack.reason,
        txError.code,
        txError.message,
      );
      return { outcome: "skipped_acknowledged", reason: ack.reason };
    }
    console.error("[fulfillCheckoutSessionCompleted] transaction insert failed:", txError.code, txError.message);
    return { outcome: "transaction_error", error: txError };
  }

  const purchaseMeta = {
    stripe_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    package_name: packageName,
    amount,
  };

  if (isUnlimited) {
    const { error: grantError } = await supabaseAdmin.rpc("grant_unlimited_credits_atomic", {
      p_user_id: userId,
      p_ref_id: insertedTx?.id ?? null,
      p_meta: { ...purchaseMeta, unlimited_credits: true },
    });

    if (grantError) {
      const ack = acknowledgeOnlyDbError(grantError);
      await supabaseAdmin.from("transactions").delete().eq("stripe_session_id", session.id);
      if (ack.acknowledge) {
        console.error(
          "[fulfillCheckoutSessionCompleted] unlimited grant skipped:",
          ack.reason,
          grantError.code,
          grantError.message,
        );
        return { outcome: "skipped_acknowledged", reason: ack.reason };
      }
      console.error("[fulfillCheckoutSessionCompleted] unlimited grant failed:", grantError.code, grantError.message);
      return { outcome: "fulfillment_error", error: grantError };
    }
  } else {
    const { error: creditError } = await supabaseAdmin.rpc("add_credits_atomic", {
      p_user_id: userId,
      p_credits: credits,
      p_entry_type: "purchase",
      p_ref_id: insertedTx?.id ?? null,
      p_meta: purchaseMeta,
    });

    if (creditError) {
      const ack = acknowledgeOnlyDbError(creditError);
      await supabaseAdmin.from("transactions").delete().eq("stripe_session_id", session.id);
      if (ack.acknowledge) {
        console.error(
          "[fulfillCheckoutSessionCompleted] credits skipped:",
          ack.reason,
          creditError.code,
          creditError.message,
        );
        return { outcome: "skipped_acknowledged", reason: ack.reason };
      }
      console.error("[fulfillCheckoutSessionCompleted] credit update failed:", creditError.code, creditError.message);
      return { outcome: "fulfillment_error", error: creditError };
    }
  }

  const { error: auditError } = await supabaseAdmin.from("audit_log").insert({
    actor_id: null,
    action: "stripe.checkout.completed",
    resource: "credit_balance",
    resource_id: userId,
    detail: {
      stripe_session_id: session.id,
      credits: isUnlimited ? 0 : credits,
      amount,
      package_name: packageName,
      unlimited_credits: isUnlimited,
    },
  });
  if (auditError) {
    console.error("[fulfillCheckoutSessionCompleted] audit log failed (non-fatal):", auditError.code, auditError.message);
  }

  return { outcome: "fulfilled" };
}
