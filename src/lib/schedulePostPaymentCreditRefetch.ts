import type { QueryClient } from "@tanstack/react-query";
import { userDashboardKeys } from "@/lib/queryKeys";

/**
 * Stripe redirects to the app before `checkout.session.completed` may finish.
 * A single immediate invalidate often refetches stale credits and caches them
 * (see staleTime on dashboard / credit-balance queries). Staggered invalidates
 * pick up the balance once the webhook has applied `add_credits_atomic`.
 */
export const POST_PAYMENT_CREDIT_REFETCH_DELAYS_MS = [0, 800, 2500, 6000, 15000] as const;

export function schedulePostPaymentCreditRefetch(queryClient: QueryClient, userId: string): void {
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: userDashboardKeys.detail(userId) });
    void queryClient.invalidateQueries({ queryKey: ["credit-balance", userId] });
  };

  for (const ms of POST_PAYMENT_CREDIT_REFETCH_DELAYS_MS) {
    setTimeout(invalidate, ms);
  }
}
