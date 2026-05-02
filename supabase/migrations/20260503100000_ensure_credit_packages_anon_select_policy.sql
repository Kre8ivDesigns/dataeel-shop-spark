-- Idempotent: anonymous visitors (/pricing, homepage) must read credit_packages.
-- Apply even if 20260502180000_credit_packages_anon_select.sql never ran on this database.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'credit_packages'
      AND policyname = 'Anon can view credit packages'
  ) THEN
    CREATE POLICY "Anon can view credit packages"
    ON public.credit_packages FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;
