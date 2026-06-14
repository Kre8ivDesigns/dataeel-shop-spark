-- Facebook (Meta) Ads daily insights cache.
-- Rows are written by the `facebook-ads-insights` Edge Function using the
-- service-role key (which bypasses RLS). Admins read it from the analytics page.

CREATE TABLE IF NOT EXISTS public.fb_ads_insights (
  date DATE PRIMARY KEY,
  account_id TEXT NOT NULL,
  account_currency TEXT,
  spend NUMERIC(14, 2) NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  reach BIGINT NOT NULL DEFAULT 0,
  ctr NUMERIC(8, 4) NOT NULL DEFAULT 0,
  cpc NUMERIC(12, 4) NOT NULL DEFAULT 0,
  purchases INTEGER NOT NULL DEFAULT 0,
  purchase_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_ads_insights_date
  ON public.fb_ads_insights (date DESC);

ALTER TABLE public.fb_ads_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read facebook ads insights"
  ON public.fb_ads_insights FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
