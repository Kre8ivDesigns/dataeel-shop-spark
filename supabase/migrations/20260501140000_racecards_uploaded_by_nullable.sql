-- Cron / S3 sync may register PDFs without an acting user session.
ALTER TABLE public.racecards
  ALTER COLUMN uploaded_by DROP NOT NULL;

COMMENT ON COLUMN public.racecards.uploaded_by IS
  'Uploader auth.users id when known; NULL when registered by automated S3 sync/cron.';
