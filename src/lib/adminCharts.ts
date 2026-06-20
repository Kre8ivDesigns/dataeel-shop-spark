/** UTC date key yyyy-mm-dd from ISO timestamp */
export function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function filterSince<T extends { created_at: string }>(rows: T[], days: number): T[] {
  if (days <= 0) return rows;
  const cutoff = Date.now() - days * 86400000;
  return rows.filter((r) => new Date(r.created_at).getTime() >= cutoff);
}

export function filterFromToday<T extends { created_at: string }>(
  rows: T[],
  now = new Date(),
): T[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return rows.filter((r) => new Date(r.created_at).getTime() >= start.getTime());
}

type RevenueTransaction = {
  amount: number;
  status: string;
  stripe_session_id?: string | null;
};

export function isLiveStripeRevenueTransaction(row: RevenueTransaction): boolean {
  return row.status === "completed" && Number(row.amount) > 0 && row.stripe_session_id?.startsWith("cs_live_") === true;
}

export function filterLiveStripeRevenueTransactions<T extends RevenueTransaction>(rows: T[]): T[] {
  return rows.filter(isLiveStripeRevenueTransaction);
}

export function sumByDayAmount(
  rows: { created_at: string; amount: number; status: string; stripe_session_id?: string | null }[],
): { date: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const r of filterLiveStripeRevenueTransactions(rows)) {
    const d = toDateKey(r.created_at);
    map.set(d, (map.get(d) ?? 0) + Number(r.amount));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));
}

export function countByDay(rows: { created_at: string }[]): { date: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = toDateKey(r.created_at);
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export function sumByPackage(
  rows: { package_name: string; amount: number; status: string; stripe_session_id?: string | null }[],
): { name: string; amount: number; count: number }[] {
  const map = new Map<string, { amount: number; count: number }>();
  for (const r of filterLiveStripeRevenueTransactions(rows)) {
    const cur = map.get(r.package_name) ?? { amount: 0, count: 0 };
    cur.amount += Number(r.amount);
    cur.count += 1;
    map.set(r.package_name, cur);
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount);
}

export function exportTransactionsCsv(
  rows: {
    id: string;
    created_at: string;
    package_name: string;
    credits: number;
    amount: number;
    status: string;
    stripe_payment_intent_id?: string | null;
    stripe_session_id?: string | null;
    user_id: string;
    user_display_name?: string;
  }[],
): string {
  const header = [
    "id",
    "stripe_payment_intent_id",
    "stripe_session_id",
    "created_at",
    "package_name",
    "credits",
    "amount",
    "status",
    "user",
    "user_id",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.stripe_payment_intent_id ?? "",
        r.stripe_session_id ?? "",
        r.created_at,
        JSON.stringify(r.package_name),
        r.credits,
        r.amount,
        r.status,
        JSON.stringify(r.user_display_name ?? r.user_id),
        r.user_id,
      ].join(","),
    );
  }
  return lines.join("\n");
}
