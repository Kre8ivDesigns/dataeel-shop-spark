import { describe, expect, it } from "vitest";
import { describeFunctionInvokeError } from "./edgeFunctionErrors";

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
