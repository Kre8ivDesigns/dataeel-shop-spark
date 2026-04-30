-- Daily cron: sync new S3 racecard PDFs into the racecards table.
-- Requires pg_cron + pg_net extensions (enabled in Supabase Dashboard →
-- Database → Extensions: search "cron" and "http" / "net").
--
-- The function accepts a CRON_SECRET bearer token in place of a user session.
-- Set the secret in Supabase Dashboard → Edge Functions → Manage secrets:
--   CRON_SECRET=<openssl rand -hex 32>
--
-- Replace <PROJECT_REF> and <CRON_SECRET_VALUE> before running,
-- or run this after setting the secret and use the helper below.

SELECT cron.schedule(
  'sync-s3-racecards-daily',
  '0 6 * * *',  -- 06:00 UTC every day
  $$
    SELECT net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-s3-racecards',
      headers := jsonb_build_object(
        'Authorization', 'Bearer <CRON_SECRET_VALUE>',
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);
