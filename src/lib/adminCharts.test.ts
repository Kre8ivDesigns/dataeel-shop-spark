import { describe, expect, it } from "vitest";
import {
  exportTransactionsCsv,
  filterFromToday,
  filterLiveStripeRevenueTransactions,
  sumByDayAmount,
  sumByPackage,
} from "./adminCharts";

describe("filterFromToday", () => {
  it("keeps rows from the current local day and excludes older rows", () => {
    const now = new Date(2026, 4, 7, 12);
    const rows = [
      { id: "old", created_at: new Date(2026, 4, 6, 23, 59, 59).toISOString() },
      { id: "start", created_at: new Date(2026, 4, 7, 0, 0, 0).toISOString() },
      { id: "later", created_at: new Date(2026, 4, 7, 15, 30, 0).toISOString() },
    ];

    expect(filterFromToday(rows, now).map((row) => row.id)).toEqual(["start", "later"]);
  });
});

describe("exportTransactionsCsv", () => {
  it("exports the resolved user name alongside the user id", () => {
    const csv = exportTransactionsCsv([
      {
        id: "tx_1",
        created_at: "2026-05-07T12:00:00.000Z",
        package_name: "Best Value",
        credits: 10,
        amount: 42,
        status: "completed",
        stripe_payment_intent_id: "pi_live_123",
        stripe_session_id: "cs_live_123",
        user_id: "user-1",
        user_display_name: "Ada Lovelace",
      },
    ]);

    expect(csv).toContain("id,stripe_payment_intent_id,stripe_session_id");
    expect(csv).toContain("tx_1,pi_live_123,cs_live_123");
    expect(csv).toContain('"Ada Lovelace",user-1');
  });
});

describe("filterLiveStripeRevenueTransactions", () => {
  const rows = [
    { id: "live", created_at: "2026-05-07T12:00:00.000Z", package_name: "Single", amount: 5, status: "completed", stripe_session_id: "cs_live_123" },
    { id: "test", created_at: "2026-05-07T12:00:00.000Z", package_name: "Single", amount: 5, status: "completed", stripe_session_id: "cs_test_123" },
    { id: "missing-session", created_at: "2026-05-07T12:00:00.000Z", package_name: "Single", amount: 5, status: "completed", stripe_session_id: null },
    { id: "pending", created_at: "2026-05-07T12:00:00.000Z", package_name: "Single", amount: 5, status: "pending", stripe_session_id: "cs_live_456" },
  ];

  it("counts only completed live Stripe checkout sessions as revenue", () => {
    expect(filterLiveStripeRevenueTransactions(rows).map((row) => row.id)).toEqual(["live"]);
  });

  it("uses the same live Stripe filter for revenue charts", () => {
    expect(sumByDayAmount(rows)).toEqual([{ date: "2026-05-07", amount: 5 }]);
    expect(sumByPackage(rows)).toEqual([{ name: "Single", amount: 5, count: 1 }]);
  });
});
