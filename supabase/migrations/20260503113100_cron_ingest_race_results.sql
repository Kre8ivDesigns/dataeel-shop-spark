-- Scheduled ingestion for normalized race results feed.
-- Requires pg_cron + pg_net extensions.
-- Replace <PROJECT_REF> and <CRON_SECRET_VALUE> before executing.

SELECT cron.schedule(
  'ingest-race-results-every-30-min',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/ingest-race-results',
      headers := jsonb_build_object(
        'Authorization', 'Bearer <CRON_SECRET_VALUE>',
        'Content-Type',  'application/json'
      ),
      body    := '{"backfill":false}'::jsonb
    );
  $$
);
