CREATE OR REPLACE FUNCTION public.normalize_race_track_code(track_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(upper(trim(coalesce(track_code, ''))), '\^+$', '');
$$;

CREATE OR REPLACE FUNCTION public.user_purchased_track_date(
  p_user_id uuid,
  p_track_code text,
  p_race_date date
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.racecard_downloads rd
    JOIN public.racecards rc ON rc.id = rd.racecard_id
    WHERE rd.user_id = p_user_id
      AND public.normalize_race_track_code(rc.track_code) = public.normalize_race_track_code(p_track_code)
      AND rc.race_date = p_race_date
  );
$$;

REVOKE ALL ON FUNCTION public.user_purchased_track_date(uuid, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_purchased_track_date(uuid, text, date) TO authenticated;

DROP POLICY IF EXISTS "Admins and purchasers can read racecard predictions" ON public.racecard_predictions;
CREATE POLICY "Admins and purchasers can read racecard predictions"
ON public.racecard_predictions
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.racecards rc
    WHERE rc.id = racecard_predictions.racecard_id
      AND public.user_purchased_track_date(auth.uid(), rc.track_code, rc.race_date)
  )
);

DROP POLICY IF EXISTS "Public can read race results" ON public.race_results;
DROP POLICY IF EXISTS "Admins and purchasers can read race results" ON public.race_results;
CREATE POLICY "Admins and purchasers can read race results"
ON public.race_results
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.user_purchased_track_date(auth.uid(), race_results.track_code, race_results.race_date)
);
