import { extractCanonicalTrackCode, getRacetrackLabel, getRacetrackLocation } from "@/lib/racetracks";

/** Builds a Commons-friendly search phrase for racetrack imagery. */
export function trackHeroImageSearchQuery(trackCode: string | null | undefined): string {
  const label = getRacetrackLabel(trackCode);
  const loc = getRacetrackLocation(trackCode);
  const canon = extractCanonicalTrackCode(trackCode);
  if (loc) {
    return `${label} ${loc.city} ${loc.state} horse racing`.trim();
  }
  if (canon) {
    return `${label} racetrack`;
  }
  return `${label} horse racing`;
}

export type TrackImageSearchResponse = {
  url: string | null;
  pageUrl?: string | null;
  source?: string;
  reason?: string;
  error?: string;
};
