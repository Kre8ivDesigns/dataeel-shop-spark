-- Client-facing listing: same rows as racecards but never exposes S3 object key (file_url).
-- PDF access remains only via download-racecard (auth + credit check + short-lived presigned GET).

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
  updated_at
FROM public.racecards;

GRANT SELECT ON public.racecards_public TO authenticated;

COMMENT ON VIEW public.racecards_public IS 'Racecard metadata for app UI; excludes file_url (S3 key).';
