-- Normalized horse-racing results store for ingestion + per-track RSS.
CREATE TABLE IF NOT EXISTS public.race_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_feed text NOT NULL DEFAULT 'otb-results-rss-2.0',
  source_id text NOT NULL,
  track_code text NOT NULL,
  track_name_raw text NOT NULL,
  race_date date NOT NULL,
  race_number integer NOT NULL CHECK (race_number >= 1 AND race_number <= 30),
  result_title text NOT NULL,
  result_summary text,
  result_description text,
  source_url text NOT NULL,
  source_pub_date timestamptz,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS race_results_source_id_uq
  ON public.race_results (source_id);

CREATE UNIQUE INDEX IF NOT EXISTS race_results_source_feed_source_url_race_uq
  ON public.race_results (source_feed, source_url, race_number);

CREATE INDEX IF NOT EXISTS race_results_track_code_race_date_idx
  ON public.race_results (track_code, race_date DESC, race_number DESC);

CREATE INDEX IF NOT EXISTS race_results_source_pub_date_idx
  ON public.race_results (source_pub_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS race_results_inserted_at_idx
  ON public.race_results (inserted_at DESC);

DROP TRIGGER IF EXISTS update_race_results_updated_at ON public.race_results;
CREATE TRIGGER update_race_results_updated_at
BEFORE UPDATE ON public.race_results
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read race results" ON public.race_results;
CREATE POLICY "Public can read race results"
ON public.race_results
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can insert race results" ON public.race_results;
CREATE POLICY "Admins can insert race results"
ON public.race_results
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update race results" ON public.race_results;
CREATE POLICY "Admins can update race results"
ON public.race_results
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete race results" ON public.race_results;
CREATE POLICY "Admins can delete race results"
ON public.race_results
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
