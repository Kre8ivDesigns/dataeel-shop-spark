import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_CREDIT_SNAPSHOT, type CreditBalanceSnapshot } from "@/lib/creditDisplay";

export type { CreditBalanceSnapshot };

export function useCreditBalance(userId: string | undefined) {
  return useQuery({
    queryKey: ["credit-balance", userId],
    queryFn: async (): Promise<CreditBalanceSnapshot> => {
      if (!userId) return EMPTY_CREDIT_SNAPSHOT;
      const { data } = await supabase
        .from("credit_balances")
        .select("credits, unlimited_credits")
        .eq("user_id", userId)
        .maybeSingle();
      return {
        credits: data?.credits ?? 0,
        unlimited: data?.unlimited_credits ?? false,
      };
    },
    enabled: !!userId,
    refetchOnWindowFocus: "always",
  });
}
