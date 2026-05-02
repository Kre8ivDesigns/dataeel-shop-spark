/** Snapshot from `credit_balances` for UI and eligibility helpers. */
export type CreditBalanceSnapshot = {
  credits: number;
  unlimited: boolean;
};

export const EMPTY_CREDIT_SNAPSHOT: CreditBalanceSnapshot = {
  credits: 0,
  unlimited: false,
};

/** Primary label for balances (numeric credits or "Unlimited"). */
export function formatCreditsBalance(snapshot: CreditBalanceSnapshot): string {
  if (snapshot.unlimited) return "Unlimited";
  return String(snapshot.credits);
}

/** Short suffix after the number (empty when unlimited). */
export function creditsUnitSuffix(snapshot: CreditBalanceSnapshot): string {
  if (snapshot.unlimited) return "";
  return snapshot.credits === 1 ? "credit" : "credits";
}

/** RaceCard download / checkout eligibility. */
export function hasSufficientCredits(snapshot: CreditBalanceSnapshot, required = 1): boolean {
  if (snapshot.unlimited) return true;
  return snapshot.credits >= required;
}
