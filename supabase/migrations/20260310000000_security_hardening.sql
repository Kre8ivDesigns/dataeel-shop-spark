-- ============================================================
-- Security Hardening — SOC2 Compliance
-- ============================================================

-- 1. Add stripe_customer_id to profiles (HIGH-03: stop using email lookup)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 2. Add stripe_session_id UNIQUE to transactions (CRIT-04: idempotent webhook)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_stripe_session_id_key
  ON public.transactions (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- 3. Atomic credit update — called by service-role webhook (CRIT-04)
CREATE OR REPLACE FUNCTION public.add_credits_atomic(p_user_id UUID, p_credits INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO credit_balances (user_id, credits) VALUES (p_user_id, p_credits)
  ON CONFLICT (user_id) DO UPDATE SET credits = credit_balances.credits + p_credits;
END;
$$;

-- 4. Admin-only credit grant callable from authenticated client (MED-04)
CREATE OR REPLACE FUNCTION public.admin_grant_credits(p_user_id UUID, p_credits INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: caller is not an admin';
  END IF;
  IF p_credits <= 0 THEN
    RAISE EXCEPTION 'Credits must be a positive integer';
  END IF;
  PERFORM public.add_credits_atomic(p_user_id, p_credits);
END;
$$;

-- 5. Audit log table — append-only (MED-07)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id TEXT,
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log; nobody can modify it via client
CREATE POLICY "Admins can read audit log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies — only service role can write via edge functions

-- 6. Fix racecard_downloads RLS — add TO authenticated (MED-06)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own downloads" ON public.racecard_downloads;
  DROP POLICY IF EXISTS "Only admins can insert downloads" ON public.racecard_downloads;
EXCEPTION WHEN undefined_table THEN NULL;
END$$;

DO $$
BEGIN
  CREATE POLICY "Users can view own downloads"
    ON public.racecard_downloads FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

  CREATE POLICY "Only admins can insert downloads"
    ON public.racecard_downloads FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN undefined_table THEN NULL;
END$$;
