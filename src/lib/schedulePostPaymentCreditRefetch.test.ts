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

    vi.advanceTimersByTime(0);
    expect(invalidateQueries).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(800);
    expect(invalidateQueries).toHaveBeenCalledTimes(4);

    vi.advanceTimersByTime(2500 - 800);
    expect(invalidateQueries).toHaveBeenCalledTimes(6);
  });

  it("exports delays covering webhook latency", () => {
    expect(POST_PAYMENT_CREDIT_REFETCH_DELAYS_MS[0]).toBe(0);
    expect(POST_PAYMENT_CREDIT_REFETCH_DELAYS_MS.length).toBeGreaterThanOrEqual(3);
  });
});
