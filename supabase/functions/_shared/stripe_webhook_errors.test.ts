import { describe, expect, it } from "vitest";
import { acknowledgeOnlyDbError } from "./stripe_webhook_errors.ts";

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

  it("acknowledges add_credits_atomic missing from message", () => {
    const r = acknowledgeOnlyDbError({
      code: "P0001",
      message: "function public.add_credits_atomic(uuid,integer,text,uuid,jsonb) does not exist",
    });
    expect(r.acknowledge).toBe(true);
    expect(r.reason).toBe("function_missing");
  });
});
