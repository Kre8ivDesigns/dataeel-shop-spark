import { describe, expect, it } from "vitest";
import {
  creditLedgerDetailFromMeta,
  creditLedgerEntryTypeLabel,
  creditLedgerUserDisplay,
  emailByUserIdFromProfiles,
  formatLedgerBalance,
  formatLedgerDelta,
} from "./adminCreditLedger";

describe("emailByUserIdFromProfiles", () => {
  it("builds a lookup from profile rows", () => {
    expect(
      emailByUserIdFromProfiles([
        { user_id: "a", email: "a@x.com" },
        { user_id: "b", email: "b@x.com" },
      ]),
    ).toEqual({ a: "a@x.com", b: "b@x.com" });
  });
});

describe("creditLedgerEntryTypeLabel", () => {
  it("uses title case words", () => {
    expect(creditLedgerEntryTypeLabel("download_deduction")).toBe("Download Deduction");
    expect(creditLedgerEntryTypeLabel("admin_grant")).toBe("Admin Grant");
  });
});

describe("creditLedgerDetailFromMeta", () => {
  it("describes unlimited grant and unlimited download rows", () => {
    expect(creditLedgerDetailFromMeta({ unlimited_grant: true })).toBe("Unlimited access granted");
    expect(creditLedgerDetailFromMeta({ unlimited: true })).toBe("No credits charged (unlimited)");
    expect(creditLedgerDetailFromMeta({})).toBe("");
  });
});

describe("formatLedgerDelta / formatLedgerBalance", () => {
  it("marks delta 0 unlimited rows", () => {
    expect(formatLedgerDelta(0, { unlimited_grant: true })).toBe("0 (∞)");
    expect(formatLedgerDelta(0, { unlimited: true })).toBe("0 (∞)");
    expect(formatLedgerDelta(-1, { unlimited: true })).toBe("-1");
  });

  it("suffixes balance on unlimited grant rows", () => {
    expect(formatLedgerBalance(20, { unlimited_grant: true })).toBe("20 (∞)");
    expect(formatLedgerBalance(20, {})).toBe("20");
  });
});

describe("creditLedgerUserDisplay", () => {
  it("prefers email when present", () => {
    expect(creditLedgerUserDisplay("uuid-here", { "uuid-here": "u@example.com" })).toBe("u@example.com");
  });

  it("falls back to short user id prefix", () => {
    expect(creditLedgerUserDisplay("abcdef12-0000-0000-0000-000000000000", {})).toBe("abcdef12");
  });
});
