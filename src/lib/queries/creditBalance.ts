import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_CREDIT_SNAPSHOT, isUnlimitedActive, type CreditBalanceSnapshot } from "@/lib/creditDisplay";

export type { CreditBalanceSnapshot };

export function useCreditBalance(userId: string | undefined) {
  return useQuery({
    queryKey: ["credit-balance", userId],
    queryFn: async (): Promise<CreditBalanceSnapshot> => {
      if (!userId) return EMPTY_CREDIT_SNAPSHOT;
      const { data } = await supabase
        .from("credit_balances")
        .select("credits, unlimited_credits, unlimited_expires_at")
        .eq("user_id", userId)
        .maybeSingle();
      return {
        credits: data?.credits ?? 0,
        unlimited: isUnlimitedActive(data?.unlimited_credits, data?.unlimited_expires_at),
        unlimitedExpiresAt: data?.unlimited_expires_at ?? null,
      };
    },
    enabled: !!userId,
    refetchOnWindowFocus: "always",
  });
}
