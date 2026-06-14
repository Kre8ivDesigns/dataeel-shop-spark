-- Append-only log of every racecard download event (date/time + user).
-- Unlike public.racecard_downloads (which is deduplicated via UNIQUE(user_id, racecard_id)
-- to prevent double-charging), this table records ONE row per download issuance,
-- including repeat downloads of the same racecard by the same user.
CREATE TABLE IF NOT EXISTS public.racecard_download_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  racecard_id UUID NOT NULL REFERENCES public.racecards(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_racecard_download_events_user
  ON public.racecard_download_events (user_id);
CREATE INDEX IF NOT EXISTS idx_racecard_download_events_racecard
  ON public.racecard_download_events (racecard_id);
CREATE INDEX IF NOT EXISTS idx_racecard_download_events_created_at
  ON public.racecard_download_events (created_at DESC);

ALTER TABLE public.racecard_download_events ENABLE ROW LEVEL SECURITY;

-- RLS policies (guarded so re-running the migration won't error).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'racecard_download_events'
      AND policyname = 'Users can view own download events'
  ) THEN
    -- Users can read their own events; admins can read all.
    CREATE POLICY "Users can view own download events"
      ON public.racecard_download_events FOR SELECT
      USING (user_id = auth.uid() OR is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'racecard_download_events'
      AND policyname = 'Users can insert own download events'
  ) THEN
    -- Rows are written by the download-racecard edge function using the service
    -- role, which bypasses RLS. This policy mirrors racecard_downloads for parity.
    CREATE POLICY "Users can insert own download events"
      ON public.racecard_download_events FOR INSERT
      WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));
  END IF;
END $$;

-- Backfill from the existing (deduplicated) downloads table so the report is not
-- empty on day one. Reads racecard_downloads and writes the new table only; the
-- NOT EXISTS guard keeps it idempotent. Note: racecard_downloads holds one row per
-- user/racecard (first download), so repeat-download history accrues from here on.
INSERT INTO public.racecard_download_events (user_id, racecard_id, created_at)
SELECT d.user_id, d.racecard_id, d.created_at
FROM public.racecard_downloads d
WHERE NOT EXISTS (
  SELECT 1 FROM public.racecard_download_events e
  WHERE e.user_id = d.user_id
    AND e.racecard_id = d.racecard_id
    AND e.created_at = d.created_at
);
