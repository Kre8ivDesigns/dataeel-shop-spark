/**
 * Re-exports shared racecard filename parsing (see `supabase/functions/_shared/parseRacecardFilename.ts`).
 */
export {
  stripRacecardUuidPrefix,
  parseRacecardFilename,
  type ParsedRacecardFilename,
} from "../../supabase/functions/_shared/parseRacecardFilename";
