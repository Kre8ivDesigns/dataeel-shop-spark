import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  invokeReconcileCheckoutSession,
  purchaseTransactionExists,
  waitForPurchaseTransaction,
} from "./postPaymentConfirmation";

const { mockMaybeSingle, mockInvoke } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockInvoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockMaybeSingle,
            })),
          })),
        })),
      })),
    })),
    functions: { invoke: mockInvoke },
  },
}));

describe("purchaseTransactionExists", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
  });

  it("returns true when a completed transaction row exists", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "tx-1" }, error: null });
    await expect(purchaseTransactionExists("u1", "cs_x")).resolves.toBe(true);
  });

  it("returns false when no row", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(purchaseTransactionExists("u1", "cs_x")).resolves.toBe(false);
  });
});

describe("invokeReconcileCheckoutSession", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("returns ok when edge function reports success", async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true, fulfilled: true }, error: null });
    await expect(invokeReconcileCheckoutSession("cs_test")).resolves.toEqual({
      ok: true,
      fulfilled: true,
      alreadyFulfilled: false,
    });
    expect(mockInvoke).toHaveBeenCalledWith("reconcile-checkout-session", {
      body: { session_id: "cs_test" },
    });
  });

  it("returns error when invoke fails", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: "network" } });
    await expect(invokeReconcileCheckoutSession("cs_test")).resolves.toMatchObject({
      ok: false,
      error: "network",
    });
  });
});

describe("waitForPurchaseTransaction", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
  });

  it("returns true once transaction row exists", async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: "tx-1" }, error: null });

    await expect(
      waitForPurchaseTransaction({
        userId: "u1",
        sessionId: "cs_test_123",
        pollIntervalMs: 20,
        maxWaitMs: 10_000,
      }),
    ).resolves.toBe(true);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(2);
  });

  it("returns false on abort before completion", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const controller = new AbortController();
    const p = waitForPurchaseTransaction({
      userId: "u1",
      sessionId: "cs_test_123",
      signal: controller.signal,
      pollIntervalMs: 50,
      maxWaitMs: 60_000,
    });
    controller.abort();
    await expect(p).resolves.toBe(false);
  });
});
