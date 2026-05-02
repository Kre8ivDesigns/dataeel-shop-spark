import { describe, expect, it } from "vitest";
import {
  addOneCalendarDayToIsoDate,
  getCalendarDateInTimeZone,
  getRacecardDownloadDeadlineUtcMillis,
  getRacecardDownloadUiBlock,
  isRacecardDownloadAvailableAt,
  zonedCalendarMidnightUtcMillis,
} from "./racecardDownloadDeadline";

describe("addOneCalendarDayToIsoDate", () => {
  it("rolls month and year", () => {
    expect(addOneCalendarDayToIsoDate("2026-01-31")).toBe("2026-02-01");
    expect(addOneCalendarDayToIsoDate("2025-12-31")).toBe("2026-01-01");
  });
});

describe("getRacecardDownloadDeadlineUtcMillis (Etc/UTC)", () => {
  it("is start of the next calendar day in UTC", () => {
    const ms = getRacecardDownloadDeadlineUtcMillis("2026-05-01", "Etc/UTC");
    expect(ms).toBe(Date.parse("2026-05-02T00:00:00.000Z"));
  });

  it("matches zoned midnight helper directly", () => {
    expect(zonedCalendarMidnightUtcMillis("2026-11-01", "Etc/UTC")).toBe(
      Date.parse("2026-11-01T00:00:00.000Z"),
    );
  });
});

describe("isRacecardDownloadAvailableAt", () => {
  it("allows download strictly before deadline (UTC)", () => {
    const deadline = getRacecardDownloadDeadlineUtcMillis("2026-07-04", "Etc/UTC");
    expect(isRacecardDownloadAvailableAt("2026-07-04", "Etc/UTC", deadline - 1)).toBe(true);
    expect(isRacecardDownloadAvailableAt("2026-07-04", "Etc/UTC", deadline)).toBe(false);
  });

  it("respects America/New_York end-of-race-day boundary vs UTC clock", () => {
    const tz = "America/New_York";
    const deadline = getRacecardDownloadDeadlineUtcMillis("2026-05-01", tz);
    expect(isRacecardDownloadAvailableAt("2026-05-01", tz, deadline - 1)).toBe(true);
    expect(isRacecardDownloadAvailableAt("2026-05-01", tz, deadline)).toBe(false);
  });
});

describe("getRacecardDownloadUiBlock", () => {
  it("blocks when calendar race_date is before today in zone", () => {
    const tz = "Etc/UTC";
    const nowMs = Date.parse("2026-03-10T12:00:00.000Z");
    expect(getCalendarDateInTimeZone(nowMs, tz)).toBe("2026-03-10");
    const r = getRacecardDownloadUiBlock("2026-03-09", tz, nowMs);
    expect(r).toEqual({ blocked: true, reason: "past_race_day" });
  });

  it("blocks at/after deadline in UTC (race day is then strictly before calendar today)", () => {
    const tz = "Etc/UTC";
    const deadline = getRacecardDownloadDeadlineUtcMillis("2026-04-01", tz);
    const r = getRacecardDownloadUiBlock("2026-04-01", tz, deadline);
    expect(r).toEqual({ blocked: true, reason: "past_race_day" });
  });

  it("allows when race day is today and before cutoff", () => {
    const tz = "Etc/UTC";
    const deadline = getRacecardDownloadDeadlineUtcMillis("2026-04-01", tz);
    const r = getRacecardDownloadUiBlock("2026-04-01", tz, deadline - 60_000);
    expect(r).toEqual({ blocked: false });
  });
});
