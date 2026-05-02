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
