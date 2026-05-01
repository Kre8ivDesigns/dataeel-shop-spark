import { describe, expect, it } from "vitest";
import { describeFunctionInvokeError, getInvokeErrorMessage } from "./edgeFunctionErrors";

describe("describeFunctionInvokeError", () => {
  it("explains 404 from FunctionsHttpError", () => {
    const err = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: new Response(null, { status: 404 }),
    };
    const msg = describeFunctionInvokeError("list-invoices", err);
    expect(msg).toContain("list-invoices");
    expect(msg).toContain("not deployed");
    expect(msg).not.toContain("Invoices are unavailable");
  });

  it("explains 404 from FunctionsHttpError for non-invoice functions", () => {
    const err = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: new Response(null, { status: 404 }),
    };
    const msg = describeFunctionInvokeError("ai-admin", err);
    expect(msg).toContain("ai-admin");
    expect(msg).toContain("not deployed");
    expect(msg).not.toContain("Invoices are unavailable");
  });

  it("explains FunctionsFetchError", () => {
    const err = {
      name: "FunctionsFetchError",
      message: "Failed to send a request to the Edge Function",
      context: new TypeError("Failed to fetch"),
    };
    const msg = describeFunctionInvokeError("list-invoices", err);
    expect(msg).toContain("Could not reach");
    expect(msg).toContain("ALLOWED_ORIGINS");
  });
});

describe("getInvokeErrorMessage", () => {
  it("returns data.error when present", async () => {
    const msg = await getInvokeErrorMessage(
      "create-checkout-session",
      { name: "FunctionsHttpError", message: "non-2xx", context: new Response(null, { status: 500 }) },
      { error: "Package has no associated Stripe price" },
    );
    expect(msg).toBe("Package has no associated Stripe price");
  });

  it("parses JSON error from FunctionsHttpError context Response", async () => {
    const res = new Response(JSON.stringify({ error: "Stripe is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
    const err = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: res,
    };
    const msg = await getInvokeErrorMessage("create-checkout-session", err, null);
    expect(msg).toBe("Stripe is not configured");
  });

  it("falls back to describeFunctionInvokeError when body has no error field", async () => {
    const res = new Response(null, { status: 404 });
    const err = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: res,
    };
    const msg = await getInvokeErrorMessage("create-checkout-session", err, null);
    expect(msg).toContain("not deployed");
  });
});
