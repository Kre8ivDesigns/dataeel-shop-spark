import { supabase } from "@/integrations/supabase/client";
import { getInvokeErrorMessage } from "@/lib/edgeFunctionErrors";

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
  | {
      ok: false;
      error: string;
      code?: string;
      payment_status?: string;
      session_status?: string;
      payment_intent_status?: string | null;
    };

/**
 * Server-side repair when the Stripe webhook did not record the purchase.
 * Same fulfillment path as `checkout.session.completed` (idempotent).
 */
export async function invokeReconcileCheckoutSession(sessionId: string): Promise<ReconcileCheckoutInvokeResult> {
  const { data, error, response } = await supabase.functions.invoke("reconcile-checkout-session", {
    body: { session_id: sessionId },
  });

  const d = (data ?? {}) as {
    ok?: boolean;
    error?: string;
    code?: string;
    already_fulfilled?: boolean;
    fulfilled?: boolean;
    detail?: string;
    payment_status?: string;
    session_status?: string;
    payment_intent_status?: string | null;
    message?: string;
  };

  if (d.ok === true) {
    return {
      ok: true,
      alreadyFulfilled: Boolean(d.already_fulfilled),
      fulfilled: Boolean(d.fulfilled),
    };
  }

  const meta = {
    code: typeof d.code === "string" ? d.code : undefined,
    payment_status: typeof d.payment_status === "string" ? d.payment_status : undefined,
    session_status: typeof d.session_status === "string" ? d.session_status : undefined,
    payment_intent_status:
      d.payment_intent_status === null || typeof d.payment_intent_status === "string"
        ? d.payment_intent_status
        : undefined,
  };

  if (typeof d.error === "string" && d.error.trim()) {
    return { ok: false, error: d.error.trim(), ...meta };
  }
  if (typeof d.message === "string" && d.message.trim()) {
    return { ok: false, error: d.message.trim(), ...meta };
  }

  const invokeMsg =
    error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message.trim()
      : "";
  if (invokeMsg) {
    return { ok: false, error: invokeMsg, ...meta };
  }

  const msg = await getInvokeErrorMessage("reconcile-checkout-session", error, data, response ?? null);

  return { ok: false, error: msg || "Payment could not be synced", ...meta };
}
