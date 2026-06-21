/** Snapshot from `credit_balances` for UI and eligibility helpers. */
export type CreditBalanceSnapshot = {
  credits: number;
  unlimited: boolean;
  unlimitedExpiresAt?: string | null;
};

export const EMPTY_CREDIT_SNAPSHOT: CreditBalanceSnapshot = {
  credits: 0,
  unlimited: false,
  unlimitedExpiresAt: null,
};

export function isUnlimitedActive(unlimited: boolean | null | undefined, expiresAt?: string | null): boolean {
  if (!unlimited) return false;
  if (!expiresAt) return true;
  const expiry = new Date(expiresAt).getTime();
  return Number.isFinite(expiry) && expiry > Date.now();
}

/** Primary label for balances (numeric credits or "Unlimited"). */
export function formatCreditsBalance(snapshot: CreditBalanceSnapshot): string {
  if (isUnlimitedActive(snapshot.unlimited, snapshot.unlimitedExpiresAt)) return "Unlimited";
  return String(snapshot.credits);
}

/** Short suffix after the number (empty when unlimited). */
export function creditsUnitSuffix(snapshot: CreditBalanceSnapshot): string {
  if (isUnlimitedActive(snapshot.unlimited, snapshot.unlimitedExpiresAt)) return "";
  return snapshot.credits === 1 ? "credit" : "credits";
}

/** RaceCard download / checkout eligibility. */
export function hasSufficientCredits(snapshot: CreditBalanceSnapshot, required = 1): boolean {
  if (isUnlimitedActive(snapshot.unlimited, snapshot.unlimitedExpiresAt)) return true;
  return snapshot.credits >= required;
}
