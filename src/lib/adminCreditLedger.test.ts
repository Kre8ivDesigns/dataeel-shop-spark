import { describe, expect, it } from "vitest";
import {
  creditLedgerEntryTypeLabel,
  creditLedgerUserDisplay,
  emailByUserIdFromProfiles,
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
  it("replaces underscores with spaces", () => {
    expect(creditLedgerEntryTypeLabel("download_deduction")).toBe("download deduction");
    expect(creditLedgerEntryTypeLabel("admin_grant")).toBe("admin grant");
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
