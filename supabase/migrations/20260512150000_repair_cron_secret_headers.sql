-- Reinstall scheduled Edge Function jobs with explicit cron-secret headers.
--
-- Prerequisite: store the same CRON_SECRET used by Edge Functions in Supabase
-- Vault with:
--   select vault.create_secret('<actual-cron-secret>', 'CRON_SECRET');

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

DO $$
DECLARE
  job record;
  cron_secret text;
BEGIN
  SELECT decrypted_secret
  INTO cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  LIMIT 1;

  IF cron_secret IS NULL OR length(trim(cron_secret)) = 0 THEN
    RAISE EXCEPTION 'CRON_SECRET is missing from Supabase Vault';
  END IF;

  FOR job IN
    SELECT jobid
    FROM cron.job
    WHERE jobname IN ('ingest-race-results-every-30-min', 'sync-s3-racecards-daily')
  LOOP
    PERFORM cron.unschedule(job.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'ingest-race-results-every-30-min',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://lfjaitapxmcvysavihvp.supabase.co/functions/v1/ingest-race-results',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'CRON_SECRET'
          LIMIT 1
        ),
        'x-cron-secret',
        (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'CRON_SECRET'
          LIMIT 1
        ),
        'Content-Type',
        'application/json'
      ),
      body    := '{"backfill":false}'::jsonb
    );
  $$
);

SELECT cron.schedule(
  'sync-s3-racecards-daily',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://lfjaitapxmcvysavihvp.supabase.co/functions/v1/sync-s3-racecards',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'CRON_SECRET'
          LIMIT 1
        ),
        'Content-Type',
        'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);
