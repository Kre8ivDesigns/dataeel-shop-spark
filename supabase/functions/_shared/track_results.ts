import { extractCanonicalTrackCode, getRacetrackLabel, normalizeTrackCode } from "./racetracks.ts";

/**
 * Site-targeted tracks for published race results feeds.
 * Keep this aligned with the frontend list in `src/lib/resultsTracks.ts`.
 */
export const TARGET_RESULTS_TRACK_CODES = [
  "AQU",
  "ASD",
  "BAQ",
  "BEL",
  "BTP",
  "CD",
  "CMR",
  "CT",
  "DMR",
  "ELP",
  "FE",
  "FG",
  "FL",
  "GG",
  "GP",
  "HAW",
  "KD",
  "KEE",
  "LRL",
  "MED",
  "MNR",
  "MTH",
  "MVR",
  "OP",
  "PEN",
  "PIM",
  "PRX",
  "SA",
  "SAR",
  "TAM",
  "WO",
] as const;

const TARGET_SET = new Set<string>(TARGET_RESULTS_TRACK_CODES);
const CODE_ALIASES: Record<string, string> = {
  DM: "DMR",
  EL: "ELP",
  GPW: "GP",
};

const NAME_ALIASES: Record<string, string> = {
  "BELMONT AT THE BIG A": "BAQ",
  "BELMONT BIG A": "BAQ",
  "BELTERRA PARK": "BTP",
  "CAMARERO": "CMR",
  "CHARLES TOWN RACES": "CT",
  "DEL MAR": "DMR",
  "ELLIS PARK": "ELP",
  "FAIR GROUNDS RACE COURSE": "FG",
  "FINGER LAKES RACETRACK": "FL",
  "GULFSTREAM PARK WEST": "GP",
  "GULFSTREAM WEST": "GP",
  "GULFSTREAM PARK": "GP",
  "HAWTHORNE RACE COURSE": "HAW",
  "MAHONING VALLEY RACE COURSE": "MVR",
  "MEADOWLANDS": "MED",
  "MEADOW LANDS": "MED",
  "MONMOUTH": "MTH",
  "PARX": "PRX",
  "SANTA ANITA": "SA",
  "SARATOGA RACE COURSE": "SAR",
  "TAMPA BAY": "TAM",
};

for (const code of TARGET_RESULTS_TRACK_CODES) {
  NAME_ALIASES[getRacetrackLabel(code).toUpperCase()] = code;
}

function normalizeTextForSearch(value: string): string {
  return value
    .toUpperCase()
    .replace(/&AMP;/g, "&")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SORTED_NAME_ALIASES = Object.entries(NAME_ALIASES).sort((a, b) => b[0].length - a[0].length);

export function isTargetResultsTrackCode(trackCode: string | null | undefined): boolean {
  if (!trackCode) return false;
  return TARGET_SET.has(trackCode);
}

export function canonicalizeResultsTrackCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = extractCanonicalTrackCode(normalizeTrackCode(raw));
  const aliased = CODE_ALIASES[normalized] ?? normalized;
  return TARGET_SET.has(aliased) ? aliased : null;
}

export function resolveResultsTrackCodeFromText(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const canonicalFromCode = canonicalizeResultsTrackCode(raw);
  if (canonicalFromCode) return canonicalFromCode;

  const normalizedText = normalizeTextForSearch(raw);
  if (!normalizedText) return null;
  for (const [alias, code] of SORTED_NAME_ALIASES) {
    if (normalizedText.includes(alias)) return code;
  }
  return null;
}

export function resolveResultsTrackCode(params: {
  rawTrackCode?: string | null;
  rawTrackName?: string | null;
  title?: string | null;
  description?: string | null;
}): string | null {
  const direct =
    canonicalizeResultsTrackCode(params.rawTrackCode) ||
    resolveResultsTrackCodeFromText(params.rawTrackName ?? null) ||
    resolveResultsTrackCodeFromText(params.title ?? null) ||
    resolveResultsTrackCodeFromText(params.description ?? null);
  if (direct) return direct;

  const blob = [params.title, params.description].filter(Boolean).join(" ");
  const codeMatches = blob.toUpperCase().match(/\b[A-Z]{2,4}\^?\b/g) ?? [];
  for (const candidate of codeMatches) {
    const c = canonicalizeResultsTrackCode(candidate);
    if (c) return c;
  }
  return null;
}
