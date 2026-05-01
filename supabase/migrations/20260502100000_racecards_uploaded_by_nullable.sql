-- Allow racecards registered by automated S3 sync (cron) without an acting auth user.
ALTER TABLE public.racecards
  ALTER COLUMN uploaded_by DROP NOT NULL;

COMMENT ON COLUMN public.racecards.uploaded_by IS
  'Auth user who uploaded the PDF; NULL when the row was created by automated S3 sync (e.g. cron).';
