import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCreditBalance(userId: string | undefined) {
  return useQuery({
    queryKey: ["credit-balance", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { data } = await supabase
        .from("credit_balances")
        .select("credits")
        .eq("user_id", userId)
        .maybeSingle();
      return data?.credits ?? 0;
    },
    enabled: !!userId,
    refetchOnWindowFocus: "always",
  });
}
