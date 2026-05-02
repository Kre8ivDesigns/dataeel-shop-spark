/**
 * Racecard PDF downloads are available until **midnight at the end of the calendar race day**
 * in the configured IANA timezone: i.e. until (but not including) the instant that is
 * `race_date + 1` calendar day at 00:00:00 local time in that zone.
 *
 * Mirrors Edge behavior in `supabase/functions/_shared/racecardDeadline.ts` (kept in sync).
 */

export const DEFAULT_RACECARD_DOWNLOAD_TZ = "America/New_York";

/** Calendar `race_date` + 1 day (Gregorian, UTC calendar arithmetic on the Y-M-D parts). */
export function addOneCalendarDayToIsoDate(isoDate: string): string {
  const [ys, ms, ds] = isoDate.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + 1);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * When Temporal is available (e.g. modern Deno / some browsers), use it for the deadline instant.
 * Otherwise use Intl + iterative correction (see comments in loop).
 */
export function zonedCalendarMidnightUtcMillis(
  isoYmd: string,
  timeZone: string,
): number {
  const T = (globalThis as unknown as { Temporal?: typeof Temporal }).Temporal;
  if (T?.PlainDate?.from && T?.PlainTime?.from) {
    const zdt = T.PlainDate.from(isoYmd).toZonedDateTime({
      timeZone,
      plainTime: T.PlainTime.from("00:00"),
    });
    return Number(zdt.toInstant().epochMilliseconds);
  }

  const [y, m, d] = isoYmd.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const target = `${y}-${pad(m)}-${pad(d)}`;

  // `sv-SE` yields stable yyyy-mm-dd parts for comparison.
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const readLocal = (t: number) => {
    const parts = formatter.formatToParts(new Date(t));
    const get = (type: Intl.DateTimeFormatPart["type"]) =>
      parts.find((p) => p.type === type)?.value ?? "";
    const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
    const hh = Number(get("hour"));
    const mi = Number(get("minute"));
    const ss = Number(get("second"));
    return { dateStr, hh, mi, ss };
  };

  // Start near local noon on that calendar day to reduce DST edge oscillation, then snap to 00:00.
  let t = Date.UTC(y, m - 1, d, 12, 0, 0);

  for (let i = 0; i < 48; i++) {
    const { dateStr, hh, mi, ss } = readLocal(t);
    if (dateStr === target && hh === 0 && mi === 0 && ss === 0) {
      return t;
    }
    if (dateStr < target) {
      t += 12 * 3600000;
      continue;
    }
    if (dateStr > target) {
      t -= 12 * 3600000;
      continue;
    }
    // Correct wall time toward 00:00:00 on target date.
    t -= hh * 3600000 + mi * 60000 + ss * 1000;
  }

  throw new Error(`Could not resolve local midnight for ${isoYmd} in ${timeZone}`);
}

/** Instant when the download window closes (start of the calendar day after `race_date` in `timeZone`). */
export function getRacecardDownloadDeadlineUtcMillis(
  raceDate: string,
  timeZone: string,
): number {
  const nextDay = addOneCalendarDayToIsoDate(raceDate);
  return zonedCalendarMidnightUtcMillis(nextDay, timeZone);
}

export function isRacecardDownloadAvailableAt(
  raceDate: string,
  timeZone: string,
  nowMs: number,
): boolean {
  return nowMs < getRacecardDownloadDeadlineUtcMillis(raceDate, timeZone);
}

/** `YYYY-MM-DD` for the calendar date of `nowMs` in `timeZone`. */
export function getCalendarDateInTimeZone(nowMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
}

export type RacecardDownloadUiBlockReason = "past_race_day" | "closed_after_race_day";

export function getRacecardDownloadUiBlock(
  raceDate: string,
  timeZone: string,
  nowMs: number,
): { blocked: false } | { blocked: true; reason: RacecardDownloadUiBlockReason } {
  const today = getCalendarDateInTimeZone(nowMs, timeZone);
  if (raceDate < today) {
    return { blocked: true, reason: "past_race_day" };
  }
  if (!isRacecardDownloadAvailableAt(raceDate, timeZone, nowMs)) {
    return { blocked: true, reason: "closed_after_race_day" };
  }
  return { blocked: false };
}
