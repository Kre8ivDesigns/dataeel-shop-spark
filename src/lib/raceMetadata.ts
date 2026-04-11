import type { Json } from "@/integrations/supabase/types";

/**
 * Stored in racecards.metadata (JSONB). Populate from admin UI, scripts, or ETL — not from live AI/API on page load.
 * Extra keys are ignored; keep payloads small for public listing.
 */
export type RacecardDisplayMetadata = {
  /** Shown on cards when set, e.g. "Fast", "Good" */
  track_condition?: string;
  surface?: string;
  /** e.g. "12:30 PM ET" */
  first_post_display?: string;
  weather?: {
    summary?: string;
    temp_f?: number;
    precip_chance_pct?: number;
    wind?: string;
  };
  races?: Array<{
    number?: number;
    post_time_display?: string;
    distance?: string;
    type?: string;
  }>;
  notes?: string;
  /** Overrides CTA state for marketing cards */
  listing_status?: "available" | "coming";
};

export function parseRacecardMetadata(raw: Json | null | undefined): RacecardDisplayMetadata {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as RacecardDisplayMetadata;
}

export function metadataListingLine(meta: RacecardDisplayMetadata): string | null {
  const parts: string[] = [];
  if (meta.first_post_display) parts.push(meta.first_post_display);
  if (meta.weather?.summary) parts.push(meta.weather.summary);
  if (meta.track_condition) parts.push(meta.track_condition);
  return parts.length ? parts.join(" · ") : null;
}
