-- Create breaking_news_items table for the front-page ticker
CREATE TABLE public.breaking_news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anyone can read active items (public ticker)
ALTER TABLE public.breaking_news_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active breaking news"
ON public.breaking_news_items FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "Admins can read all breaking news"
ON public.breaking_news_items FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert breaking news"
ON public.breaking_news_items FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update breaking news"
ON public.breaking_news_items FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete breaking news"
ON public.breaking_news_items FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));
