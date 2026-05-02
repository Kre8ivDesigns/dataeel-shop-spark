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

/** Expanded PaymentIntent status when `payment_intent` is expanded on the Session. */
export function paymentIntentStatusFromSession(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (typeof pi === "object" && pi !== null && "status" in pi) {
    const st = (pi as Stripe.PaymentIntent).status;
    return typeof st === "string" ? st : null;
  }
  return null;
}

/**
 * Whether credits should be granted for this Checkout Session.
 *
 * Authoritative: `payment_status` is `paid` or `no_payment_required` per
 * https://stripe.com/docs/api/checkout/sessions/object
 *
 * Fallback: expanded `payment_intent.status === "succeeded"` — funds captured while
 * `payment_status` can briefly lag (webhook ordering). Do not use `session.status === "complete"`
 * alone; complete + unpaid is valid for async/deferred methods until paid or PI succeeds.
 */
export function isCheckoutSessionPaidForFulfillment(session: Stripe.Checkout.Session): boolean {
  const ps = session.payment_status;
  if (ps === "paid" || ps === "no_payment_required") return true;
  if (paymentIntentStatusFromSession(session) === "succeeded") return true;
  return false;
}

export type FulfillCheckoutCompletedOutcome =
  | { outcome: "fulfilled" }
  | { outcome: "duplicate" }
  | { outcome: "skipped_metadata" }
  | {
      outcome: "skipped_unpaid";
      code: "skipped_unpaid";
      payment_status: string;
      payment_intent_status: string | null;
      session_status: string | null;
    }
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

  if (!isCheckoutSessionPaidForFulfillment(session)) {
    try {
      session = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["payment_intent"],
      });
    } catch (e) {
      console.error("[fulfillCheckoutSessionCompleted] session retrieve failed:", e instanceof Error ? e.message : e);
    }
  }

  if (!isCheckoutSessionPaidForFulfillment(session)) {
    const piStatus = paymentIntentStatusFromSession(session);
    console.log(
      JSON.stringify({
        msg: "fulfill_skip_unpaid",
        stripe_session_id: session.id,
        payment_status: session.payment_status,
        payment_intent_status: piStatus,
        session_status: session.status,
      }),
    );
    return {
      outcome: "skipped_unpaid",
      code: "skipped_unpaid",
      payment_status: session.payment_status ?? "unknown",
      payment_intent_status: piStatus,
      session_status: session.status ?? null,
    };
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
      console.log(
        "[fulfillCheckoutSessionCompleted] unique violation (session or payment_intent):",
        session.id,
        paymentIntentId ?? "",
      );
      const { data: existingBySession } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();
      if (existingBySession) {
        return { outcome: "duplicate" };
      }
      if (paymentIntentId) {
        const { data: existingByPi } = await supabaseAdmin
          .from("transactions")
          .select("id, stripe_session_id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();
        if (existingByPi) {
          if (!existingByPi.stripe_session_id?.trim()) {
            const { error: updErr } = await supabaseAdmin
              .from("transactions")
              .update({ stripe_session_id: session.id })
              .eq("id", existingByPi.id);
            if (updErr) {
              console.error(
                "[fulfillCheckoutSessionCompleted] backfill stripe_session_id failed:",
                updErr.message,
              );
            } else {
              console.log(
                "[fulfillCheckoutSessionCompleted] backfilled stripe_session_id for invoice-first row:",
                session.id,
              );
            }
          }
          return { outcome: "duplicate" };
        }
      }
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
