-- Repair / idempotent: ensure `contact_submissions` exists for PostgREST (fixes PGRST205 when
-- `20260411120000_admin_platform_extensions.sql` was never applied on an environment).

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now (),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now (),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL CHECK (char_length (message) <= 20000),
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_progress', 'closed')
  ),
  admin_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions (status);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON public.contact_submissions (created_at DESC);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit contact form (anon)" ON public.contact_submissions;

DROP POLICY IF EXISTS "Authenticated users can submit contact form" ON public.contact_submissions;

DROP POLICY IF EXISTS "Admins can read contact submissions" ON public.contact_submissions;

DROP POLICY IF EXISTS "Admins can update contact submissions" ON public.contact_submissions;

CREATE POLICY "Anyone can submit contact form (anon)"
  ON public.contact_submissions FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can submit contact form"
  ON public.contact_submissions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read contact submissions"
  ON public.contact_submissions FOR SELECT TO authenticated
  USING (public.is_admin (auth.uid ()));

CREATE POLICY "Admins can update contact submissions"
  ON public.contact_submissions FOR UPDATE TO authenticated
  USING (public.is_admin (auth.uid ()))
  WITH CHECK (public.is_admin (auth.uid ()));

GRANT INSERT ON TABLE public.contact_submissions TO anon;

GRANT INSERT ON TABLE public.contact_submissions TO authenticated;
