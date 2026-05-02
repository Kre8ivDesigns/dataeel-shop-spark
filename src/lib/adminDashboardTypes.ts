import type { Tables } from "@/integrations/supabase/types";

export type AdminProfile = Tables<"profiles">;
export type AdminCustomer = AdminProfile & { credits: number; unlimitedCredits: boolean };
export type AdminTransaction = Tables<"transactions">;
export type AdminRacecard = Tables<"racecards">;

export function mergeProfilesWithCredits(
  profiles: AdminProfile[] | null | undefined,
  balances: Pick<Tables<"credit_balances">, "user_id" | "credits" | "unlimited_credits">[] | null | undefined,
): AdminCustomer[] {
  const map = new Map(
    (balances ?? []).map((b) => [
      b.user_id,
      { credits: b.credits, unlimitedCredits: b.unlimited_credits ?? false },
    ]),
  );
  return (profiles ?? []).map((p) => {
    const row = map.get(p.user_id);
    return {
      ...p,
      credits: row?.credits ?? 0,
      unlimitedCredits: row?.unlimitedCredits ?? false,
    };
  });
}
