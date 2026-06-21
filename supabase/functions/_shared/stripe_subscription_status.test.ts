import { describe, expect, it } from "vitest";
import {
  shouldRemoveUnlimitedForSubscription,
  stripeObjectId,
  subscriptionCustomerId,
  subscriptionMetadataMarksUnlimited,
  subscriptionMetadataUserId,
} from "./stripe_subscription_status.ts";

describe("stripe subscription status helpers", () => {
  it("removes unlimited for terminal or non-payable subscription statuses", () => {
    for (const status of ["canceled", "unpaid", "incomplete_expired", "paused"]) {
      expect(shouldRemoveUnlimitedForSubscription({ status })).toBe(true);
    }
  });

  it("keeps unlimited for active billing lifecycle statuses", () => {
    for (const status of ["active", "trialing", "past_due", "incomplete"]) {
      expect(shouldRemoveUnlimitedForSubscription({ status })).toBe(false);
    }
  });

  it("extracts Stripe object ids from strings or expanded objects", () => {
    expect(stripeObjectId("cus_123")).toBe("cus_123");
    expect(stripeObjectId({ id: "cus_456" })).toBe("cus_456");
    expect(stripeObjectId({ id: 123 })).toBeNull();
  });

  it("reads subscription customer and unlimited metadata", () => {
    const subscription = {
      customer: { id: "cus_live" },
      metadata: {
        user_id: "A2DB4F66-FB4A-5F5F-97ED-91354DA4F7F6",
        unlimited_credits: "true",
      },
    };

    expect(subscriptionCustomerId(subscription)).toBe("cus_live");
    expect(subscriptionMetadataUserId(subscription)).toBe("a2db4f66-fb4a-5f5f-97ed-91354da4f7f6");
    expect(subscriptionMetadataMarksUnlimited(subscription)).toBe(true);
  });
});
