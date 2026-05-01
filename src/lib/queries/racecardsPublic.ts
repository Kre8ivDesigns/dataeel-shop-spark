import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { racecardPublicKeys } from "@/lib/queryKeys";
import type { Tables } from "@/integrations/supabase/types";

export type RacecardPublicRow = Pick<
  Tables<"racecards">,
  "id" | "track_name" | "track_code" | "race_date" | "num_races" | "metadata"
>;

const RACE_LIST_STALE_MS = 2 * 60 * 1000;
const RACE_LIST_GC_MS = 30 * 60 * 1000;

export async function fetchRacecardsPublicByDate(raceDate: string): Promise<RacecardPublicRow[]> {
  const { data, error } = await supabase
    .from("racecards")
    .select("id, track_name, track_code, race_date, num_races, metadata")
    .eq("race_date", raceDate)
    .order("track_name");

  if (error) throw error;
  return (data ?? []) as RacecardPublicRow[];
}

export function useRacecardsPublicForDate(raceDate: string | undefined) {
  return useQuery({
    queryKey: raceDate ? racecardPublicKeys.byDate(raceDate) : racecardPublicKeys.all,
    queryFn: () => fetchRacecardsPublicByDate(raceDate!),
    enabled: !!raceDate,
    staleTime: RACE_LIST_STALE_MS,
    gcTime: RACE_LIST_GC_MS,
  });
}
