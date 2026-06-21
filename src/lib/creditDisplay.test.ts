import { describe, expect, it } from "vitest";
import {
  EMPTY_CREDIT_SNAPSHOT,
  creditsUnitSuffix,
  formatCreditsBalance,
  hasSufficientCredits,
  isUnlimitedActive,
  type CreditBalanceSnapshot,
} from "./creditDisplay";

describe("formatCreditsBalance", () => {
  it('returns "Unlimited" when flag is true', () => {
    expect(formatCreditsBalance({ credits: 5, unlimited: true })).toBe("Unlimited");
  });

  it("returns numeric string when not unlimited", () => {
    expect(formatCreditsBalance({ credits: 12, unlimited: false })).toBe("12");
    expect(formatCreditsBalance(EMPTY_CREDIT_SNAPSHOT)).toBe("0");
  });

  it("returns numeric string when legacy unlimited has expired", () => {
    expect(formatCreditsBalance({ credits: 2, unlimited: true, unlimitedExpiresAt: "2020-01-01T00:00:00Z" })).toBe("2");
  });
});

describe("creditsUnitSuffix", () => {
  it("returns empty when unlimited", () => {
    expect(creditsUnitSuffix({ credits: 0, unlimited: true })).toBe("");
  });

  it("singular and plural credit labels", () => {
    expect(creditsUnitSuffix({ credits: 1, unlimited: false })).toBe("credit");
    expect(creditsUnitSuffix({ credits: 3, unlimited: false })).toBe("credits");
  });
});

describe("hasSufficientCredits", () => {
  it("is always true for unlimited", () => {
    const s: CreditBalanceSnapshot = { credits: 0, unlimited: true };
    expect(hasSufficientCredits(s, 1)).toBe(true);
    expect(hasSufficientCredits(s, 999)).toBe(true);
  });

  it("compares numeric balance otherwise", () => {
    expect(hasSufficientCredits({ credits: 2, unlimited: false }, 2)).toBe(true);
    expect(hasSufficientCredits({ credits: 1, unlimited: false }, 2)).toBe(false);
  });
});

describe("isUnlimitedActive", () => {
  it("keeps subscription/admin unlimited active without an expiry", () => {
    expect(isUnlimitedActive(true, null)).toBe(true);
  });

  it("expires legacy unlimited when its expiry has passed", () => {
    expect(isUnlimitedActive(true, "2020-01-01T00:00:00Z")).toBe(false);
  });
});
