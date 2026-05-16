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

REVOKE ALL ON public.racecards_public FROM anon;
REVOKE ALL ON public.racecards_public FROM authenticated;
GRANT SELECT ON public.racecards_public TO anon, authenticated;

REVOKE SELECT ON public.racecards FROM anon;
REVOKE SELECT ON public.racecards FROM authenticated;

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
  metadata_updated_at,
  digitization_status,
  digitization_error
) ON public.racecards TO authenticated;

DROP POLICY IF EXISTS "Anon can view racecard listing metadata" ON public.racecards;
DROP POLICY IF EXISTS "Admins and purchasers can read racecards" ON public.racecards;
DROP POLICY IF EXISTS "Public can read racecard catalog rows" ON public.racecards;

CREATE POLICY "Public can read racecard catalog rows"
ON public.racecards
FOR SELECT
TO anon, authenticated
USING (true);
