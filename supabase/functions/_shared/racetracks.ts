/**
 * Duplicated from `src/lib/racetracks.ts` for Deno Edge (no import from Vite `src/`).
 * Keep both files in sync when updating the map.
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
