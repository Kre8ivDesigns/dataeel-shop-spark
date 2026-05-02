import { describe, expect, it } from "vitest";
import { parseStripePublishableMode } from "./stripeViteDev";

describe("parseStripePublishableMode", () => {
  it("returns unset for empty", () => {
    expect(parseStripePublishableMode(undefined)).toBe("unset");
    expect(parseStripePublishableMode("  ")).toBe("unset");
  });
  it("returns test for pk_test", () => {
    expect(parseStripePublishableMode("pk_test_abc")).toBe("test");
  });
  it("returns live for pk_live and other keys", () => {
    expect(parseStripePublishableMode("pk_live_abc")).toBe("live");
    expect(parseStripePublishableMode("pk_something")).toBe("live");
  });
});
