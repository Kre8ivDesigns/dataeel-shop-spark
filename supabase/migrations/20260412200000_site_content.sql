-- Optional DB-backed copy for static site/assistant text (canonical override lives in Postgres).
-- Edge Functions use the service role and bypass RLS; no client GRANT.

CREATE TABLE IF NOT EXISTS public.site_content (
  key text PRIMARY KEY,
  body text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_content IS
  'Key/value text blobs. Example: racing_assistant_knowledge — overrides bundled knowledge.ts when a row exists.';

CREATE INDEX IF NOT EXISTS idx_site_content_updated_at ON public.site_content (updated_at DESC);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT policies for authenticated/anon: only service_role (and postgres) access by default.
