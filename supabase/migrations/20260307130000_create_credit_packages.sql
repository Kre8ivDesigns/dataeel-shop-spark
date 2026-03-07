CREATE TABLE public.credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  credits INTEGER NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view credit packages"
ON public.credit_packages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage credit packages"
ON public.credit_packages FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
