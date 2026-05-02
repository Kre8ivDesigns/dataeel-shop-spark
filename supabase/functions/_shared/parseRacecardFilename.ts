/**
 * Derives `track_code` and `race_date` from racecard PDF filenames / S3 basenames.
 * Shared by the SPA (`src/lib` re-export), Admin uploads, and `sync-s3-racecards`.
 *
 * Track codes are normalized with `normalizeTrackCode` (uppercase, strip trailing `^`) to match
 * `RACETRACK_BY_CODE` keys.
 *
 * Conventions:
 * - **Underscore ISO:** `TRACKCODE_YYYY-MM-DD`, optional `__N` before `.pdf`.
 * - **Three letters + YYMMDD:** exactly three letters immediately followed by six digits `YYMMDD`, optional `__N`
 *   (e.g. `AQU260507.pdf` → AQU, 2026-05-07). Parsed only after underscore-ISO so `AQU_2026-05-07` is never
 *   misread as three letters + digits.
 * - **Caret (two letters):** exactly two letters, `^`, then `YYMMDD`, optional `__N` (e.g. `Cd^260507` → `CD`).
 *
 * **Match order** (avoid false positives): (1) strict `TRACKCODE_YYYY-MM-DD`, (2) `XXXYYMMDD`, (3) `XX^YYMMDD`,
 * (4) invalid long caret prefix → UNK + date if YYMMDD present, (5) legacy split fallback.
 */
import { normalizeTrackCode } from "./racetracks.ts";

const UUID_PREFIX_RE = /^[0-9a-f-]{36}-(.+)$/i;

/** Strip optional `uuid-` prefix from upload-style filenames. */
export function stripRacecardUuidPrefix(fileName: string): string {
  return UUID_PREFIX_RE.exec(fileName)?.[1] ?? fileName;
}

function yyMmDdToIsoRaceDate(yy: string, mm: string, dd: string): string {
  const y = 2000 + parseInt(yy, 10);
  return `${y}-${mm}-${dd}`;
}

export interface ParsedRacecardFilename {
  trackCode: string;
  raceDate: string;
}

/**
 * Parses basename or path ending in `.pdf`.
 *
 * Supported basename shapes (after optional `uuid-` prefix):
 * - `TRACKCODE_YYYY-MM-DD` — optional `__N` before `.pdf`
 * - `XXXYYMMDD` — three letters + `YYMMDD`, optional `__N` before `.pdf`
 * - `TRACKCODE^YYMMDD` (exactly two letters before `^`) — optional `__N` before `.pdf`
 * - Fallback: split on `_`; second segment ISO date or six-digit `YYMMDD`
 */
export function parseRacecardFilename(fileName: string): ParsedRacecardFilename {
  const leaf = fileName.split("/").pop() ?? fileName;
  const base = stripRacecardUuidPrefix(leaf);
  const nameWithoutExt = base.replace(/\.pdf$/i, "");

  /** (1) Underscore + ISO date — must precede `XXXYYMMDD` so e.g. `AQU_2026-05-07` is not parsed as 3 letters + digits. */
  const strictUnderscore = /^([A-Z0-9]+)_(20\d{2}-\d{2}-\d{2})(?:__\d+)?$/i.exec(nameWithoutExt);
  if (strictUnderscore) {
    return {
      trackCode: strictUnderscore[1].toUpperCase(),
      raceDate: strictUnderscore[2],
    };
  }

  /** (2) Three letters concatenated with YYMMDD — no separator; optional `__N` suffix. */
  const threeLettersYyMmDd = /^([A-Za-z]{3})(\d{2})(\d{2})(\d{2})(?:__\d+)?$/i.exec(nameWithoutExt);
  if (threeLettersYyMmDd) {
    return {
      trackCode: threeLettersYyMmDd[1].toUpperCase(),
      raceDate: yyMmDdToIsoRaceDate(
        threeLettersYyMmDd[2],
        threeLettersYyMmDd[3],
        threeLettersYyMmDd[4],
      ),
    };
  }

  /** (3) Two letters + caret + YYMMDD — distinct from `XXXYYMMDD` (no caret in the latter). */
  const caretTwoLetter = /^([A-Za-z]{2})\^(\d{2})(\d{2})(\d{2})(?:__\d+)?$/i.exec(nameWithoutExt);
  if (caretTwoLetter) {
    return {
      trackCode: caretTwoLetter[1].toUpperCase(),
      raceDate: yyMmDdToIsoRaceDate(caretTwoLetter[2], caretTwoLetter[3], caretTwoLetter[4]),
    };
  }

  /** (4) Caret with three+ letter prefix (e.g. `ABC^260507`) — not a valid two-letter caret token; keep date if present. */
  const invalidCaretLongPrefix = /^[A-Za-z]{3,}\^(\d{2})(\d{2})(\d{2})(?:__\d+)?$/i.exec(nameWithoutExt);
  if (invalidCaretLongPrefix) {
    return {
      trackCode: "UNK",
      raceDate: yyMmDdToIsoRaceDate(
        invalidCaretLongPrefix[1],
        invalidCaretLongPrefix[2],
        invalidCaretLongPrefix[3],
      ),
    };
  }

  const parts = nameWithoutExt.split("_");
  const rawTrackCode = (parts[0] ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const trackCode =
    rawTrackCode.length > 0 && rawTrackCode.length <= 10 ? rawTrackCode : "UNK";

  const rawSecond = parts[1] ?? "";
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoRegex.test(rawSecond) && !Number.isNaN(new Date(rawSecond).getTime())) {
    return { trackCode, raceDate: rawSecond };
  }

  const sixDigit = /^(\d{2})(\d{2})(\d{2})$/.exec(rawSecond);
  if (sixDigit) {
    return {
      trackCode,
      raceDate: yyMmDdToIsoRaceDate(sixDigit[1], sixDigit[2], sixDigit[3]),
    };
  }

  const raceDate = new Date().toISOString().split("T")[0];
  return { trackCode, raceDate };
}
