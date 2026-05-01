import { describe, expect, it } from "vitest";
import {
  describeFunctionInvokeError,
  formatInvokeFailureMessage,
  getInvokeErrorMessage,
} from "./edgeFunctionErrors";

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

describe("formatInvokeFailureMessage", () => {
  it("joins error and detail", () => {
    expect(
      formatInvokeFailureMessage("generate-upload-url", new Error("x"), {
        error: "AWS S3 is not configured",
        detail: "Set Edge Function secrets: AWS_S3_BUCKET",
      }),
    ).toBe("AWS S3 is not configured — Set Edge Function secrets: AWS_S3_BUCKET");
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

  it("appends data.detail to data.error when both present", async () => {
    const msg = await getInvokeErrorMessage("sync-s3-racecards", null, {
      error: "S3 list failed",
      detail: "AccessDenied: ...",
    });
    expect(msg).toBe("S3 list failed — AccessDenied: ...");
  });

  it("appends data.detail when present alongside error", async () => {
    const msg = await getInvokeErrorMessage(
      "sync-s3-racecards",
      { name: "FunctionsHttpError", message: "non-2xx", context: new Response(null, { status: 500 }) },
      {
        error: "Failed to register new racecards",
        detail: "duplicate key value violates unique constraint",
      },
    );
    expect(msg).toContain("Failed to register new racecards");
    expect(msg).toContain("duplicate key");
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

  it("parses JSON when context is Response-like but fails instanceof Response", async () => {
    const duck = {
      status: 500,
      clone() {
        return this;
      },
      async json() {
        return { error: "Nested runtime message" };
      },
      async text() {
        return "";
      },
    };
    const err = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: duck,
    };
    const msg = await getInvokeErrorMessage("create-checkout-session", err, null);
    expect(msg).toBe("Nested runtime message");
  });

  it("parses FunctionsRelayError response body the same way", async () => {
    const res = new Response(JSON.stringify({ error: "Upstream unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
    const err = {
      name: "FunctionsRelayError",
      message: "Relay Error invoking the Edge Function",
      context: res,
    };
    const msg = await getInvokeErrorMessage("fn", err, null);
    expect(msg).toBe("Upstream unavailable");
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
