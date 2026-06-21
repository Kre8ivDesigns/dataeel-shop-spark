import type { Tables } from "@/integrations/supabase/types";
import { isUnlimitedActive } from "@/lib/creditDisplay";

export type AdminProfile = Tables<"profiles">;
export type AdminCustomer = AdminProfile & { credits: number; unlimitedCredits: boolean };
export type AdminTransaction = Tables<"transactions">;
export type AdminRacecard = Pick<
  Tables<"racecards">,
  | "id"
  | "track_name"
  | "track_code"
  | "race_date"
  | "num_races"
  | "file_name"
  | "uploaded_by"
  | "created_at"
  | "updated_at"
  | "metadata"
  | "metadata_updated_at"
  | "digitization_status"
  | "digitization_error"
>;

export function mergeProfilesWithCredits(
  profiles: AdminProfile[] | null | undefined,
  balances: Pick<Tables<"credit_balances">, "user_id" | "credits" | "unlimited_credits" | "unlimited_expires_at">[] | null | undefined,
): AdminCustomer[] {
  const map = new Map(
    (balances ?? []).map((b) => [
      b.user_id,
      { credits: b.credits, unlimitedCredits: isUnlimitedActive(b.unlimited_credits, b.unlimited_expires_at) },
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
