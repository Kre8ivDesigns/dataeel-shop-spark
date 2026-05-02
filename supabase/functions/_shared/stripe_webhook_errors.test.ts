import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acknowledgeOnlyDbError,
  formatWebhookErrDetail,
  jsonErrBody,
} from "./stripe_webhook_errors.ts";

describe("acknowledgeOnlyDbError", () => {
  it("acknowledges Postgres FK violation code", () => {
    const r = acknowledgeOnlyDbError({ code: "23503", message: "fk" });
    expect(r.acknowledge).toBe(true);
    expect(r.reason).toBe("foreign_key_violation");
  });

  it("acknowledges undefined column code", () => {
    const r = acknowledgeOnlyDbError({ code: "42703", message: "col" });
    expect(r.acknowledge).toBe(true);
    expect(r.reason).toBe("schema_mismatch");
  });

  it("acknowledges FK from message text", () => {
    const r = acknowledgeOnlyDbError({
      code: "",
      message: 'insert violates foreign key constraint "transactions_user_id_fkey"',
    });
    expect(r.acknowledge).toBe(true);
    expect(r.reason).toBe("foreign_key_violation");
  });

  it("acknowledges missing column text", () => {
    const r = acknowledgeOnlyDbError({
      code: "",
      message: 'column "stripe_payment_intent_id" does not exist',
    });
    expect(r.acknowledge).toBe(true);
    expect(r.reason).toBe("schema_mismatch");
  });

  it("does not acknowledge generic constraint failures", () => {
    const r = acknowledgeOnlyDbError({ code: "23514", message: "check constraint" });
    expect(r.acknowledge).toBe(false);
  });

  it("acknowledges NOT NULL violation", () => {
    const r = acknowledgeOnlyDbError({ code: "23502", message: "null value" });
    expect(r.acknowledge).toBe(true);
    expect(r.reason).toBe("not_null_violation");
  });

  it("acknowledges undefined function", () => {
    const r = acknowledgeOnlyDbError({ code: "42883", message: "function" });
    expect(r.acknowledge).toBe(true);
    expect(r.reason).toBe("function_missing");
  });

  it("acknowledges PostgREST PGRST202 missing RPC overload", () => {
    const r = acknowledgeOnlyDbError({
      code: "PGRST202",
      message: "Could not find the function public.add_credits_atomic(p_credits, p_entry_type, p_meta, p_ref_id, p_user_id) in the schema cache",
    });
    expect(r.acknowledge).toBe(true);
    expect(r.reason).toBe("function_missing");
  });

  it("acknowledges add_credits_atomic missing from message", () => {
    const r = acknowledgeOnlyDbError({
      code: "P0001",
      message: "function public.add_credits_atomic(uuid,integer,text,uuid,jsonb) does not exist",
    });
    expect(r.acknowledge).toBe(true);
    expect(r.reason).toBe("function_missing");
  });

  it("acknowledges grant_unlimited_credits_atomic missing from message", () => {
    const r = acknowledgeOnlyDbError({
      code: "42883",
      message: "function public.grant_unlimited_credits_atomic(uuid,uuid,jsonb) does not exist",
    });
    expect(r.acknowledge).toBe(true);
    expect(r.reason).toBe("function_missing");
  });
});

describe("formatWebhookErrDetail / jsonErrBody", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("formats PostgREST-style objects with code and details", () => {
    const detail = formatWebhookErrDetail({
      message: 'column "unlimited_credits" does not exist',
      code: "42703",
      details: "Failing row contains (...).",
      hint: null,
    });
    expect(detail).toContain("42703");
    expect(detail).toContain("unlimited_credits");
    expect(detail).toContain("Failing row");
  });

  it("jsonErrBody includes postgres fields when WEBHOOK_EXPOSE_ERRORS=true", () => {
    vi.stubGlobal("Deno", {
      env: {
        get: (k: string) => (k === "WEBHOOK_EXPOSE_ERRORS" ? "true" : undefined),
      },
    });
    const body = jsonErrBody("Credit update failed", {
      message: "duplicate key",
      code: "23505",
      details: "Key already exists.",
    });
    expect(body.error).toBe("Credit update failed");
    expect(body.message).toBeDefined();
    expect(String(body.message)).toContain("23505");
    expect(body.postgres_code).toBe("23505");
    expect(body.postgres_detail).toBe("Key already exists.");
  });
});
