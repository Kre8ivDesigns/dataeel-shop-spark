-- Cached race-day display data (weather, post times, conditions, etc.) on each racecard row.
-- The site reads metadata from the database — no per-page AI or external API calls.
-- file_url / S3 keys stay off limits for anonymous users (column-level GRANT + view).

ALTER TABLE public.racecards
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata_updated_at timestamptz;

COMMENT ON COLUMN public.racecards.metadata IS
  'Public-safe JSON snapshot: weather, first_post_display, track_condition, races[], etc. Updated by admins or your ingest pipeline.';

CREATE OR REPLACE VIEW public.racecards_public
WITH (security_invoker = true)
AS
SELECT
  id,
  track_name,
  track_code,
  race_date,
  num_races,
  file_name,
  uploaded_by,
  created_at,
  updated_at,
  metadata,
  metadata_updated_at
FROM public.racecards;

GRANT SELECT ON public.racecards_public TO authenticated;
GRANT SELECT ON public.racecards_public TO anon;

-- Anonymous clients may read catalog fields only (not file_url / S3 key).
GRANT SELECT (
  id,
  track_name,
  track_code,
  race_date,
  num_races,
  file_name,
  uploaded_by,
  created_at,
  updated_at,
  metadata,
  metadata_updated_at
) ON public.racecards TO anon;

DROP POLICY IF EXISTS "Anon can view racecard listing metadata" ON public.racecards;

CREATE POLICY "Anon can view racecard listing metadata"
  ON public.racecards
  FOR SELECT
  TO anon
  USING (true);
