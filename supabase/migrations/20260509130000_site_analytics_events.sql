CREATE TABLE IF NOT EXISTS public.site_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_name TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  path TEXT,
  page_title TEXT,
  referrer TEXT,
  referrer_host TEXT,
  source TEXT NOT NULL DEFAULT 'direct',
  medium TEXT NOT NULL DEFAULT 'none',
  campaign TEXT,
  content TEXT,
  term TEXT,
  device_type TEXT NOT NULL DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'tablet', 'mobile')),
  is_new_visitor BOOLEAN NOT NULL DEFAULT false,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  properties JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_site_analytics_events_created_at
  ON public.site_analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_analytics_events_event_name
  ON public.site_analytics_events (event_name);

CREATE INDEX IF NOT EXISTS idx_site_analytics_events_session_id
  ON public.site_analytics_events (session_id);

CREATE INDEX IF NOT EXISTS idx_site_analytics_events_visitor_id
  ON public.site_analytics_events (visitor_id);

CREATE INDEX IF NOT EXISTS idx_site_analytics_events_source_medium
  ON public.site_analytics_events (source, medium);

ALTER TABLE public.site_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert site analytics"
  ON public.site_analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins can read site analytics"
  ON public.site_analytics_events FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

GRANT INSERT ON TABLE public.site_analytics_events TO anon;
GRANT INSERT ON TABLE public.site_analytics_events TO authenticated;
