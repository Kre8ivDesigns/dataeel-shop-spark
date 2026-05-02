import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import {
  POST_PAYMENT_CREDIT_REFETCH_DELAYS_MS,
  schedulePostPaymentCreditRefetch,
} from "./schedulePostPaymentCreditRefetch";

describe("schedulePostPaymentCreditRefetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invalidates dashboard and credit-balance at each staggered delay", () => {
    const invalidateQueries = vi.fn();
    const queryClient = { invalidateQueries } as unknown as QueryClient;

    schedulePostPaymentCreditRefetch(queryClient, "user-1");

    expect(invalidateQueries).toHaveBeenCalledTimes(0);

    let prev = 0;
    for (const ms of POST_PAYMENT_CREDIT_REFETCH_DELAYS_MS) {
      vi.advanceTimersByTime(ms - prev);
      prev = ms;
      expect(invalidateQueries).toHaveBeenCalledTimes((POST_PAYMENT_CREDIT_REFETCH_DELAYS_MS.indexOf(ms) + 1) * 2);
    }
  });

  it("exports delays covering webhook latency", () => {
    expect(POST_PAYMENT_CREDIT_REFETCH_DELAYS_MS[0]).toBe(0);
    expect(POST_PAYMENT_CREDIT_REFETCH_DELAYS_MS.length).toBeGreaterThanOrEqual(3);
  });
});
