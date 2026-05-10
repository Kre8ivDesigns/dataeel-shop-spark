import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extractCanonicalTrackCode } from "@/lib/racetracks";
import type { Tables } from "@/integrations/supabase/types";

export type RacetrackProfile = Tables<"racetrack_profiles">;

const RACETRACK_PROFILE_STALE_MS = 10 * 60 * 1000;
const RACETRACK_PROFILE_GC_MS = 60 * 60 * 1000;

export async function fetchRacetrackProfiles(): Promise<RacetrackProfile[]> {
  const { data, error } = await supabase
    .from("racetrack_profiles")
    .select("*")
    .order("track_code");

  if (error) throw error;
  return (data ?? []) as RacetrackProfile[];
}

export function useRacetrackProfiles() {
  return useQuery({
    queryKey: ["racetrack-profiles"],
    queryFn: fetchRacetrackProfiles,
    staleTime: RACETRACK_PROFILE_STALE_MS,
    gcTime: RACETRACK_PROFILE_GC_MS,
  });
}

export function profilesByTrackCode(profiles: RacetrackProfile[]): Record<string, RacetrackProfile> {
  return profiles.reduce<Record<string, RacetrackProfile>>((acc, profile) => {
    acc[extractCanonicalTrackCode(profile.track_code)] = profile;
    return acc;
  }, {});
}
