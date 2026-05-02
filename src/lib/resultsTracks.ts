import { getRacetrackLabel } from "@/lib/racetracks";

/**
 * Keep aligned with `supabase/functions/_shared/track_results.ts`.
 * These are the site-target tracks used for race-results ingestion + publishing.
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

export function canonicalizeResultsTrackCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) return null;
  const canonical = CODE_ALIASES[normalized] ?? normalized;
  return TARGET_SET.has(canonical) ? canonical : null;
}

export function getTargetResultsTrackOptions(): Array<{ code: string; label: string }> {
  return TARGET_RESULTS_TRACK_CODES.map((code) => ({
    code,
    label: getRacetrackLabel(code),
  }));
}
