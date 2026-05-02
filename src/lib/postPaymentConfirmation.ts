import { supabase } from "@/integrations/supabase/client";

/** Poll interval while waiting for stripe-webhook to insert `transactions`. */
export const POST_PAYMENT_POLL_INTERVAL_MS = 1_000;
/** Max wait before we tell the user to refresh or contact support. */
export const POST_PAYMENT_POLL_MAX_MS = 90_000;

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = window.setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/**
 * Resolves true when the webhook has recorded this Checkout session (same row as credits).
 * Uses RLS: user_id must match auth uid.
 */
export async function waitForPurchaseTransaction(params: {
  userId: string;
  sessionId: string;
  signal?: AbortSignal;
  pollIntervalMs?: number;
  maxWaitMs?: number;
}): Promise<boolean> {
  if (params.signal?.aborted) return false;

  const interval = params.pollIntervalMs ?? POST_PAYMENT_POLL_INTERVAL_MS;
  const deadline = Date.now() + (params.maxWaitMs ?? POST_PAYMENT_POLL_MAX_MS);

  while (Date.now() < deadline) {
    if (params.signal?.aborted) return false;

    const { data, error } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", params.userId)
      .eq("stripe_session_id", params.sessionId)
      .eq("status", "completed")
      .maybeSingle();

    if (!error && data?.id) return true;

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      await delay(Math.min(interval, remaining), params.signal);
    } catch {
      return false;
    }
  }

  return false;
}

/** Single check for completed transaction row (after reconcile or poll). */
export async function purchaseTransactionExists(userId: string, sessionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("stripe_session_id", sessionId)
    .eq("status", "completed")
    .maybeSingle();

  return !error && Boolean(data?.id);
}

export type ReconcileCheckoutInvokeResult =
  | { ok: true; alreadyFulfilled?: boolean; fulfilled?: boolean }
  | { ok: false; error: string };

/**
 * Server-side repair when the Stripe webhook did not record the purchase.
 * Same fulfillment path as `checkout.session.completed` (idempotent).
 */
export async function invokeReconcileCheckoutSession(sessionId: string): Promise<ReconcileCheckoutInvokeResult> {
  const { data, error } = await supabase.functions.invoke("reconcile-checkout-session", {
    body: { session_id: sessionId },
  });

  if (error) {
    return { ok: false, error: error.message || "Reconcile request failed" };
  }

  const d = data as {
    ok?: boolean;
    error?: string;
    already_fulfilled?: boolean;
    fulfilled?: boolean;
    detail?: string;
  };

  if (d?.ok === true) {
    return {
      ok: true,
      alreadyFulfilled: Boolean(d.already_fulfilled),
      fulfilled: Boolean(d.fulfilled),
    };
  }

  const msg =
    typeof d?.error === "string"
      ? d.error
      : typeof (d as { message?: string })?.message === "string"
        ? (d as { message: string }).message
        : "Payment could not be synced";

  return { ok: false, error: msg };
}
