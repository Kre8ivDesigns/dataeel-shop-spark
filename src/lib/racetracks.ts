/**
 * Track code → display name. Keys normalized: uppercase, trailing `^` stripped.
 * Caret-suffixed codes (e.g. `CD^`) collapse to `CD` via `normalizeTrackCode`.
 * Keep in sync with `supabase/functions/_shared/racetracks.ts` (Deno cannot import from Vite `src/`).
 */
export const RACETRACK_BY_CODE: Record<string, string> = {
  AP: "Arlington Park",
  AQU: "Aqueduct",
  ASD: "Assiniboia Downs",
  BAQ: "Belmont at the Big A",
  BEL: "Belmont Park",
  BTP: "Belterra Park",
  CBY: "Canterbury Park",
  CD: "Churchill Downs",
  CMR: "Camarero Race Track",
  CNL: "Colonial Downs",
  CRC: "Gulfstream Park West",
  CT: "Charles Town",
  DED: "Delta Downs",
  DEL: "Delaware Park",
  DM: "Del Mar",
  DMR: "Del Mar",
  EL: "Ellis Park",
  ELP: "Ellis Park",
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
  MED: "Meadow Lands",
  MNR: "Mountaineer Park",
  MTH: "Monmouth Park",
  MVR: "Mahoning Valley",
  OP: "Oaklawn Park",
  PEN: "Penn National",
  PID: "Presque Isle Downs",
  PIM: "Pimlico",
  PRM: "Prairie Meadows",
  PRX: "Parx Racing",
  RP: "Remington Park",
  SA: "Santa Anita Park",
  SAR: "Saratoga",
  SUN: "Sunland Park",
  TAM: "Tampa Bay Downs",
  TD: "Thistledown",
  TUP: "Turf Paradise",
  WO: "Woodbine",
};

/** Uppercase, trim, strip trailing carets (PHP-style `CD^`). Safe for null/empty DB values. */
export function normalizeTrackCode(trackCode: string | null | undefined): string {
  if (trackCode == null || typeof trackCode !== "string") return "";
  let s = trackCode.trim().toUpperCase();
  while (s.endsWith("^")) {
    s = s.slice(0, -1);
  }
  return s;
}

/**
 * DB/filename noise like `KEE2604111` → `KEE` for map lookup. Plain `CT`, `CD`, etc. unchanged.
 */
export function extractCanonicalTrackCode(raw: string | null | undefined): string {
  const n = normalizeTrackCode(raw);
  const compact = n.replace(/[^A-Z0-9]/g, "");
  const prefixed = /^([A-Z]{2,4})(\d+)/.exec(compact);
  if (prefixed && prefixed[2].length >= 4) {
    return prefixed[1];
  }
  return n;
}

export function getRacetrackLabel(trackCode: string | null | undefined): string {
  const key = extractCanonicalTrackCode(trackCode);
  const label = RACETRACK_BY_CODE[key];
  const raw = trackCode != null && typeof trackCode === "string" ? trackCode.trim() : "";
  return label ?? (key || raw || "Track");
}

/** City + state/province for cards and listings; Canadian tracks use province abbreviations. */
export type RacetrackLocation = { city: string; state: string };

export const RACETRACK_LOCATION_BY_CODE: Record<string, RacetrackLocation> = {
  AP: { city: "Arlington Heights", state: "IL" },
  AQU: { city: "Ozone Park", state: "NY" },
  ASD: { city: "Winnipeg", state: "MB" },
  BAQ: { city: "Ozone Park", state: "NY" },
  BEL: { city: "Elmont", state: "NY" },
  BTP: { city: "Florence", state: "IN" },
  CBY: { city: "Shakopee", state: "MN" },
  CD: { city: "Louisville", state: "KY" },
  CMR: { city: "Canovanas", state: "PR" },
  CNL: { city: "New Kent", state: "VA" },
  CRC: { city: "Hallandale Beach", state: "FL" },
  CT: { city: "Charles Town", state: "WV" },
  DED: { city: "Vinton", state: "LA" },
  DEL: { city: "Wilmington", state: "DE" },
  DM: { city: "Del Mar", state: "CA" },
  DMR: { city: "Del Mar", state: "CA" },
  EL: { city: "Henderson", state: "KY" },
  ELP: { city: "Henderson", state: "KY" },
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
  MED: { city: "East Rutherford", state: "NJ" },
  MNR: { city: "Chester", state: "WV" },
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

export function getRacetrackLocation(trackCode: string | null | undefined): RacetrackLocation | null {
  const key = extractCanonicalTrackCode(trackCode);
  return RACETRACK_LOCATION_BY_CODE[key] ?? null;
}

export const RACETRACK_WEBSITE_BY_CODE: Record<string, string> = {
  AQU: "https://www.nyra.com/aqueduct/",
  ASD: "https://www.asdowns.com/",
  BAQ: "https://www.nyra.com/belmont-at-the-big-a/",
  BEL: "https://www.nyra.com/belmont/",
  BTP: "https://www.belterrapark.com/racing",
  CD: "https://www.churchilldowns.com/",
  CMR: "https://hipodromocamarero.com/",
  CT: "https://www.hollywoodcasinocharlestown.com/racing",
  DED: "https://www.deltadownsracing.com/",
  DMR: "https://www.dmtc.com/",
  ELP: "https://ellisparkracing.com/",
  FE: "https://www.forterieracing.com/",
  FG: "https://www.fairgroundsracecourse.com/",
  FL: "https://www.fingerlakesgaming.com/racing",
  GP: "https://www.gulfstreampark.com/",
  HAW: "https://www.hawthorneracecourse.com/",
  HOU: "https://www.shrp.com/",
  KD: "https://www.kentuckydowns.com/",
  KEE: "https://www.keeneland.com/",
  LA: "https://www.losalamitos.com/",
  LAD: "https://www.ladowns.com/",
  LRL: "https://www.laurelpark.com/",
  MED: "https://playmeadowlands.com/",
  MNR: "https://www.cnty.com/mountaineer/racing/",
  MTH: "https://www.monmouthpark.com/",
  MVR: "https://www.hollywoodmahoningvalley.com/racing",
  OP: "https://www.oaklawn.com/racing/",
  PEN: "https://www.hollywoodpnrc.com/racing",
  PIM: "https://www.pimlico.com/",
  PRM: "https://www.prairiemeadows.com/racing",
  PRX: "https://www.parxracing.com/",
  SA: "https://www.santaanita.com/",
  SAR: "https://www.nyra.com/saratoga/",
  TAM: "https://www.tampabaydowns.com/",
  WO: "https://woodbine.com/",
};

export function getRacetrackWebsite(trackCode: string | null | undefined): string | null {
  const key = extractCanonicalTrackCode(trackCode);
  return RACETRACK_WEBSITE_BY_CODE[key] ?? null;
}

export type RacetrackWeatherLocation = {
  latitude: number;
  longitude: number;
  timezone: string;
};

export const RACETRACK_WEATHER_BY_CODE: Record<string, RacetrackWeatherLocation> = {
  AQU: { latitude: 40.6728, longitude: -73.8272, timezone: "America/New_York" },
  ASD: { latitude: 49.8844, longitude: -97.3294, timezone: "America/Winnipeg" },
  BAQ: { latitude: 40.6728, longitude: -73.8272, timezone: "America/New_York" },
  BEL: { latitude: 40.7147, longitude: -73.7225, timezone: "America/New_York" },
  BTP: { latitude: 39.1006, longitude: -84.6114, timezone: "America/New_York" },
  CD: { latitude: 38.2029, longitude: -85.7714, timezone: "America/Kentucky/Louisville" },
  CMR: { latitude: 18.3894, longitude: -65.8761, timezone: "America/Puerto_Rico" },
  CT: { latitude: 39.2967, longitude: -77.8606, timezone: "America/New_York" },
  DED: { latitude: 30.1956, longitude: -93.5813, timezone: "America/Chicago" },
  DMR: { latitude: 32.9753, longitude: -117.2606, timezone: "America/Los_Angeles" },
  ELP: { latitude: 37.8872, longitude: -87.5714, timezone: "America/Chicago" },
  FE: { latitude: 42.9078, longitude: -78.9328, timezone: "America/Toronto" },
  FG: { latitude: 29.9858, longitude: -90.0775, timezone: "America/Chicago" },
  FL: { latitude: 42.9622, longitude: -77.3503, timezone: "America/New_York" },
  GP: { latitude: 25.9786, longitude: -80.1394, timezone: "America/New_York" },
  HAW: { latitude: 41.8294, longitude: -87.7447, timezone: "America/Chicago" },
  HOU: { latitude: 29.9308, longitude: -95.5253, timezone: "America/Chicago" },
  KD: { latitude: 36.6544, longitude: -86.5636, timezone: "America/Chicago" },
  KEE: { latitude: 38.0469, longitude: -84.6086, timezone: "America/New_York" },
  LA: { latitude: 33.8031, longitude: -118.0436, timezone: "America/Los_Angeles" },
  LAD: { latitude: 32.5492, longitude: -93.6344, timezone: "America/Chicago" },
  LRL: { latitude: 39.1047, longitude: -76.8311, timezone: "America/New_York" },
  MED: { latitude: 40.8136, longitude: -74.0744, timezone: "America/New_York" },
  MNR: { latitude: 40.5586, longitude: -80.6403, timezone: "America/New_York" },
  MTH: { latitude: 40.3075, longitude: -74.0167, timezone: "America/New_York" },
  MVR: { latitude: 41.1225, longitude: -80.7703, timezone: "America/New_York" },
  OP: { latitude: 34.485, longitude: -93.0594, timezone: "America/Chicago" },
  PEN: { latitude: 40.3972, longitude: -76.6503, timezone: "America/New_York" },
  PIM: { latitude: 39.3514, longitude: -76.675, timezone: "America/New_York" },
  PRM: { latitude: 41.6547, longitude: -93.4917, timezone: "America/Chicago" },
  PRX: { latitude: 40.1233, longitude: -74.9567, timezone: "America/New_York" },
  SA: { latitude: 34.1392, longitude: -118.0444, timezone: "America/Los_Angeles" },
  SAR: { latitude: 43.0731, longitude: -73.7675, timezone: "America/New_York" },
  TAM: { latitude: 28.0497, longitude: -82.6483, timezone: "America/New_York" },
  WO: { latitude: 43.7122, longitude: -79.6044, timezone: "America/Toronto" },
};

export function getRacetrackWeatherLocation(trackCode: string | null | undefined): RacetrackWeatherLocation | null {
  const key = extractCanonicalTrackCode(trackCode);
  return RACETRACK_WEATHER_BY_CODE[key] ?? null;
}
