CREATE OR REPLACE VIEW public.racecards_public
WITH (security_invoker = false)
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

REVOKE ALL ON public.racecards FROM anon;
REVOKE ALL ON public.racecards FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.racecards TO authenticated;

DROP POLICY IF EXISTS "Anon can view racecard listing metadata" ON public.racecards;
DROP POLICY IF EXISTS "Everyone can view racecards" ON public.racecards;
DROP POLICY IF EXISTS "Admins and purchasers can read racecards" ON public.racecards;

CREATE POLICY "Admins and purchasers can read racecards"
ON public.racecards
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.user_purchased_track_date(auth.uid(), racecards.track_code, racecards.race_date)
);
