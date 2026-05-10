ALTER TABLE public.racecards
  ADD COLUMN IF NOT EXISTS digitization_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS textract_job_id text,
  ADD COLUMN IF NOT EXISTS digitization_error text,
  ADD COLUMN IF NOT EXISTS digitization_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS digitized_at timestamptz;

ALTER TABLE public.racecards
  DROP CONSTRAINT IF EXISTS racecards_digitization_status_check;

ALTER TABLE public.racecards
  ADD CONSTRAINT racecards_digitization_status_check
  CHECK (digitization_status IN ('not_started', 'queued', 'processing', 'digitized', 'needs_review', 'failed'));

CREATE INDEX IF NOT EXISTS racecards_file_url_idx
  ON public.racecards (file_url);

CREATE UNIQUE INDEX IF NOT EXISTS racecards_textract_job_id_uq
  ON public.racecards (textract_job_id)
  WHERE textract_job_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.racecard_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  racecard_id uuid NOT NULL REFERENCES public.racecards(id) ON DELETE CASCADE,
  race_number integer NOT NULL CHECK (race_number >= 1 AND race_number <= 30),
  algorithm text NOT NULL CHECK (algorithm IN ('concert', 'aptitude')),
  rank integer NOT NULL CHECK (rank >= 1),
  horse_name text NOT NULL,
  horse_number text,
  odds text,
  score numeric,
  ocr_confidence numeric,
  raw_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS racecard_predictions_rank_uq
  ON public.racecard_predictions (racecard_id, race_number, algorithm, rank);

CREATE INDEX IF NOT EXISTS racecard_predictions_race_lookup_idx
  ON public.racecard_predictions (racecard_id, race_number, algorithm);

ALTER TABLE public.racecard_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read racecard predictions" ON public.racecard_predictions;
CREATE POLICY "Admins can read racecard predictions"
ON public.racecard_predictions
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert racecard predictions" ON public.racecard_predictions;
CREATE POLICY "Admins can insert racecard predictions"
ON public.racecard_predictions
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update racecard predictions" ON public.racecard_predictions;
CREATE POLICY "Admins can update racecard predictions"
ON public.racecard_predictions
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete racecard predictions" ON public.racecard_predictions;
CREATE POLICY "Admins can delete racecard predictions"
ON public.racecard_predictions
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
