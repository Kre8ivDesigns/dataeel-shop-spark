/**
 * Track code → display name. Keys are normalized: uppercase, no trailing `^`.
 * Keep in sync with `supabase/functions/_shared/racetracks.ts` (Deno cannot import from src/).
 */
export const RACETRACK_BY_CODE: Record<string, string> = {
  AP: "Arlington Park",
  AQU: "Aqueduct",
  ASD: "Assiniboia Downs",
  BEL: "Belmont Park",
  CBY: "Canterbury Park",
  CD: "Churchill Downs",
  CMR: "Charles Town",
  CNL: "Colonial Downs",
  CRC: "Gulfstream Park West",
  CT: "Charles Town",
  DED: "Delta Downs",
  DEL: "Delaware Park",
  DM: "Del Mar",
  EL: "Ellis Park",
  EM: "Emerald Downs",
  EV: "Evangeline Downs",
  FE: "Fort Erie",
  FG: "Fair Grounds",
  FL: "Finger Lakes",
  GG: "Golden Gate Fields",
  GP: "Gulfstream Park",
  GPW: "Gulfstream Park West",
  HAW: "Hawthorne",
  HOL: "Hollywood Park",
  HOU: "Sam Houston Race Park",
  KD: "Kentucky Downs",
  KEE: "Keeneland",
  LA: "Los Alamitos",
  LAD: "Louisiana Downs",
  LRL: "Laurel Park",
  MNR: "Mountaineer",
  MTH: "Monmouth Park",
  MVR: "Mahoning Valley",
  OP: "Oaklawn Park",
  PEN: "Penn National",
  PID: "Presque Isle Downs",
  PIM: "Pimlico",
  PRM: "Prairie Meadows",
  PRX: "Parx",
  RP: "Remington Park",
  SA: "Santa Anita Park",
  SAR: "Saratoga",
  SUN: "Sunland Park",
  TAM: "Tampa Bay Downs",
  TD: "Thistledown",
  TUP: "Turf Paradise",
  WO: "Woodbine",
};

/** Uppercase, trim, strip trailing carets (PHP-style `CD^`). */
export function normalizeTrackCode(trackCode: string): string {
  let s = trackCode.trim().toUpperCase();
  while (s.endsWith("^")) {
    s = s.slice(0, -1);
  }
  return s;
}

export function getRacetrackLabel(trackCode: string): string {
  const key = normalizeTrackCode(trackCode);
  const label = RACETRACK_BY_CODE[key];
  return label ?? (key || trackCode);
}

/** City + state/province for cards and listings; Canadian tracks use province abbreviations. */
export type RacetrackLocation = { city: string; state: string };

export const RACETRACK_LOCATION_BY_CODE: Record<string, RacetrackLocation> = {
  AP: { city: "Arlington Heights", state: "IL" },
  AQU: { city: "Ozone Park", state: "NY" },
  ASD: { city: "Winnipeg", state: "MB" },
  BEL: { city: "Elmont", state: "NY" },
  CBY: { city: "Shakopee", state: "MN" },
  CD: { city: "Louisville", state: "KY" },
  CMR: { city: "Charles Town", state: "WV" },
  CNL: { city: "New Kent", state: "VA" },
  CRC: { city: "Hallandale Beach", state: "FL" },
  CT: { city: "Charles Town", state: "WV" },
  DED: { city: "Vinton", state: "LA" },
  DEL: { city: "Wilmington", state: "DE" },
  DM: { city: "Del Mar", state: "CA" },
  EL: { city: "Henderson", state: "KY" },
  EM: { city: "Auburn", state: "WA" },
  EV: { city: "Opelousas", state: "LA" },
  FE: { city: "Fort Erie", state: "ON" },
  FG: { city: "New Orleans", state: "LA" },
  FL: { city: "Farmington", state: "NY" },
  GG: { city: "Berkeley", state: "CA" },
  GP: { city: "Hallandale Beach", state: "FL" },
  GPW: { city: "Hallandale Beach", state: "FL" },
  HAW: { city: "Cicero", state: "IL" },
  HOL: { city: "Inglewood", state: "CA" },
  HOU: { city: "Houston", state: "TX" },
  KD: { city: "Franklin", state: "KY" },
  KEE: { city: "Lexington", state: "KY" },
  LA: { city: "Los Alamitos", state: "CA" },
  LAD: { city: "Bossier City", state: "LA" },
  LRL: { city: "Laurel", state: "MD" },
  MNR: { city: "New Cumberland", state: "WV" },
  MTH: { city: "Oceanport", state: "NJ" },
  MVR: { city: "Youngstown", state: "OH" },
  OP: { city: "Hot Springs", state: "AR" },
  PEN: { city: "Grantville", state: "PA" },
  PID: { city: "Erie", state: "PA" },
  PIM: { city: "Baltimore", state: "MD" },
  PRM: { city: "Altoona", state: "IA" },
  PRX: { city: "Bensalem", state: "PA" },
  RP: { city: "Oklahoma City", state: "OK" },
  SA: { city: "Arcadia", state: "CA" },
  SAR: { city: "Saratoga Springs", state: "NY" },
  SUN: { city: "Sunland Park", state: "NM" },
  TAM: { city: "Tampa", state: "FL" },
  TD: { city: "Cleveland", state: "OH" },
  TUP: { city: "Phoenix", state: "AZ" },
  WO: { city: "Toronto", state: "ON" },
};

export function getRacetrackLocation(trackCode: string): RacetrackLocation | null {
  const key = normalizeTrackCode(trackCode);
  return RACETRACK_LOCATION_BY_CODE[key] ?? null;
}
