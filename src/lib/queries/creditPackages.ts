import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Matches `public.credit_packages` columns used by checkout and marketing pages. */
export interface CreditPackageRow {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  price: number;
  stripe_price_id: string | null;
  unlimited_credits: boolean;
}

export const CREDIT_PACKAGES_QUERY_KEY = ["credit-packages"] as const;

/** Same select/order as BuyCredits — single source for package lists. */
export async function fetchCreditPackages(): Promise<CreditPackageRow[]> {
  const { data, error } = await supabase
    .from("credit_packages")
    .select("id, name, description, credits, price, stripe_price_id, unlimited_credits")
    .order("price", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type UseCreditPackagesOptions = {
  /** If true, only rows usable by create-checkout-session (requires stripe_price_id). */
  purchasableOnly?: boolean;
};

export function useCreditPackages(options?: UseCreditPackagesOptions) {
  const purchasableOnly = options?.purchasableOnly ?? false;
  return useQuery({
    queryKey: [...CREDIT_PACKAGES_QUERY_KEY, purchasableOnly] as const,
    queryFn: async () => {
      const rows = await fetchCreditPackages();
      if (purchasableOnly) {
        return rows.filter((p) => Boolean(p.stripe_price_id));
      }
      return rows;
    },
  });
}

/** Generic bullets — not tier-specific dollar amounts; details come from DB name/description. */
export const PRICING_STANDARD_FEATURES = [
  "Any track, any day",
  "Both algorithms included",
  "PDF download format",
] as const;

export const PRICING_UNLIMITED_FEATURES = [
  "Unlimited RaceCard PDF downloads (fair use)",
  "Full-day track PDF packs · any track, any day",
  "Both algorithms included in every PDF",
  "Priority support",
] as const;

/**
 * Estimated savings vs buying the smallest credit bundle at its per-credit rate (all from DB).
 * Returns null if not applicable or no positive savings.
 */
export function savingsVsSmallestCreditBundle(
  pkg: CreditPackageRow,
  packages: CreditPackageRow[],
): number | null {
  if (pkg.unlimited_credits || pkg.credits <= 0) return null;
  const creditPacks = packages.filter((p) => !p.unlimited_credits && p.credits > 0);
  if (creditPacks.length === 0) return null;
  const minCredits = Math.min(...creditPacks.map((p) => p.credits));
  const baseline = creditPacks.filter((p) => p.credits === minCredits);
  const unit = Math.min(...baseline.map((p) => p.price / p.credits));
  const atUnitRate = unit * pkg.credits;
  const raw = atUnitRate - pkg.price;
  if (raw <= 0) return null;
  return Math.round(raw * 100) / 100;
}

export function formatPackageUsd(price: unknown): string {
  const n = Number(price);
  if (Number.isNaN(n)) return "—";
  return n % 1 === 0 ? `$${Math.round(n)}` : `$${n.toFixed(2)}`;
}

export function packageFeatureBullets(pkg: CreditPackageRow): string[] {
  if (pkg.unlimited_credits) {
    return [...PRICING_UNLIMITED_FEATURES];
  }
  const creditLine = `${pkg.credits} RaceCard download${pkg.credits !== 1 ? "s" : ""}`;
  return [creditLine, ...PRICING_STANDARD_FEATURES];
}

/** Line under headline price */
export function packagePriceTagline(pkg: CreditPackageRow): string {
  const price = Number(pkg.price);
  if (pkg.unlimited_credits) {
    return "Unlimited RaceCard PDF downloads · one-time purchase";
  }
  if (pkg.credits <= 0) return `${formatPackageUsd(price)} · Credit package`;
  const ppc = price / pkg.credits;
  return `${pkg.credits} credit${pkg.credits !== 1 ? "s" : ""} · ${formatPackageUsd(ppc)}/card`;
}

/** Highlight middle tier when there are at least 3 packages (same sort as query). */
export function popularPackageIndex(count: number): number {
  if (count < 3) return -1;
  return Math.floor(count / 2);
}

export function packageCtaLabel(pkg: CreditPackageRow): string {
  if (pkg.unlimited_credits) return "Get unlimited PDF access";
  return `Buy ${pkg.credits} credit${pkg.credits !== 1 ? "s" : ""}`;
}
