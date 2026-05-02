-- Webhooks call add_credits_atomic(uuid, int, text, uuid, jsonb). If only the legacy
-- (uuid, int) overload exists (or PostgREST schema cache is stale), RPC fails with PGRST202.
-- This migration idempotently installs the canonical 5-arg definition from admin_platform_extensions.

DROP FUNCTION IF EXISTS public.add_credits_atomic (uuid, int);

CREATE OR REPLACE FUNCTION public.add_credits_atomic (
  p_user_id UUID,
  p_credits INT,
  p_entry_type TEXT DEFAULT 'adjustment',
  p_ref_id UUID DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_balance INT;
BEGIN
  IF p_credits = 0 THEN
    RETURN;
  END IF;

  IF p_entry_type NOT IN ('purchase', 'admin_grant', 'download_deduction', 'adjustment') THEN
    RAISE EXCEPTION 'Invalid entry_type';
  END IF;

  INSERT INTO public.credit_balances (user_id, credits)
  VALUES (p_user_id, p_credits)
  ON CONFLICT (user_id) DO UPDATE SET
    credits = public.credit_balances.credits + EXCLUDED.credits,
    updated_at = now();

  SELECT credits INTO v_balance FROM public.credit_balances WHERE user_id = p_user_id;

  INSERT INTO public.credit_ledger (
    user_id,
    delta,
    balance_after,
    entry_type,
    ref_id,
    meta
  )
  VALUES (
    p_user_id,
    p_credits,
    v_balance,
    p_entry_type,
    p_ref_id,
    COALESCE(p_meta, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_credits_atomic (uuid, int, text, uuid, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.add_credits_atomic (uuid, int, text, uuid, jsonb) TO service_role;
