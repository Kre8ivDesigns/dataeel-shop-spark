import type { Tables } from "@/integrations/supabase/types";

export type AdminProfile = Tables<"profiles">;
export type AdminCustomer = AdminProfile & { credits: number };
export type AdminTransaction = Tables<"transactions">;
export type AdminRacecard = Tables<"racecards">;

export function mergeProfilesWithCredits(
  profiles: AdminProfile[] | null | undefined,
  balances: Pick<Tables<"credit_balances">, "user_id" | "credits">[] | null | undefined,
): AdminCustomer[] {
  const map = new Map((balances ?? []).map((b) => [b.user_id, b.credits]));
  return (profiles ?? []).map((p) => ({ ...p, credits: map.get(p.user_id) ?? 0 }));
}
