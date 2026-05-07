import { describe, expect, it } from "vitest";
import { exportTransactionsCsv, filterFromToday } from "./adminCharts";

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
        user_id: "user-1",
        user_display_name: "Ada Lovelace",
      },
    ]);

    expect(csv).toContain("user,user_id");
    expect(csv).toContain('"Ada Lovelace",user-1');
  });
});
