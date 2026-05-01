-- Repair / idempotent: ensure metadata columns, public catalog view, and anon-safe listing access.
-- Applied when an environment has `racecards` but PostgREST reports racecards_public missing (PGRST205).

ALTER TABLE public.racecards
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata_updated_at timestamptz;

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
