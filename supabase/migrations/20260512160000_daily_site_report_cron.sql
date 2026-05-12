-- Daily morning analytics + SEO report.
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
    WHERE jobname = 'daily-site-analytics-seo-report'
  LOOP
    PERFORM cron.unschedule(job.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'daily-site-analytics-seo-report',
  '0 13 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://lfjaitapxmcvysavihvp.supabase.co/functions/v1/daily-site-report',
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
      body    := '{}'::jsonb
    );
  $$
);
