import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { waitForPurchaseTransaction } from "./postPaymentConfirmation";

const maybeSingle = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle,
            })),
          })),
        })),
      })),
    })),
  },
}));

describe("waitForPurchaseTransaction", () => {
  beforeEach(() => {
    maybeSingle.mockReset();
  });

  it("returns true once transaction row exists", async () => {
    maybeSingle
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
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("returns false on abort before completion", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
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
