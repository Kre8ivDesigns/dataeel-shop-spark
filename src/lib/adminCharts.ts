/** UTC date key yyyy-mm-dd from ISO timestamp */
export function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function filterSince<T extends { created_at: string }>(rows: T[], days: number): T[] {
  if (days <= 0) return rows;
  const cutoff = Date.now() - days * 86400000;
  return rows.filter((r) => new Date(r.created_at).getTime() >= cutoff);
}

export function sumByDayAmount(
  rows: { created_at: string; amount: number; status: string }[],
): { date: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.status !== "completed") continue;
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
  rows: { package_name: string; amount: number; status: string }[],
): { name: string; amount: number; count: number }[] {
  const map = new Map<string, { amount: number; count: number }>();
  for (const r of rows) {
    if (r.status !== "completed") continue;
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
    user_id: string;
  }[],
): string {
  const header = ["id", "created_at", "package_name", "credits", "amount", "status", "user_id"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.created_at,
        JSON.stringify(r.package_name),
        r.credits,
        r.amount,
        r.status,
        r.user_id,
      ].join(","),
    );
  }
  return lines.join("\n");
}
