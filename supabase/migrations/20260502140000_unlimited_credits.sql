-- Unlimited RaceCard credits: explicit flags on balances and packages, RPC for Stripe webhook,
-- and deduction path that does not decrement balance when unlimited is enabled.

ALTER TABLE public.credit_balances
  ADD COLUMN IF NOT EXISTS unlimited_credits BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.credit_packages
  ADD COLUMN IF NOT EXISTS unlimited_credits BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.credit_balances.unlimited_credits IS 'When true, downloads do not decrement credits; balance checks treat user as having sufficient credits.';
COMMENT ON COLUMN public.credit_packages.unlimited_credits IS 'When true, completing checkout for this package grants unlimited_credits on the purchaser''s balance (no integer credits added).';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS unlimited_credits BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.transactions.unlimited_credits IS 'True when this completed purchase granted unlimited RaceCard access instead of integer credits.';

-- Grant unlimited flag + ledger row (delta 0); preserves existing integer credits on conflict.
CREATE OR REPLACE FUNCTION public.grant_unlimited_credits_atomic (
  p_user_id UUID,
  p_ref_id UUID,
  p_meta JSONB DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_balance INT;
BEGIN
  INSERT INTO public.credit_balances (user_id, credits, unlimited_credits)
  VALUES (p_user_id, 0, true)
  ON CONFLICT (user_id) DO UPDATE SET
    unlimited_credits = true,
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
    0,
    v_balance,
    'purchase',
    p_ref_id,
    COALESCE(p_meta, '{}'::jsonb) || jsonb_build_object('unlimited_grant', true)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_unlimited_credits_atomic (UUID, UUID, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.grant_unlimited_credits_atomic (UUID, UUID, JSONB) TO service_role;

-- Downloads: unlimited users skip balance decrement but still record download + ledger (delta 0).
CREATE OR REPLACE FUNCTION public.deduct_credit_if_sufficient (
  p_user_id UUID,
  p_racecard_id UUID,
  p_required_credits INTEGER DEFAULT 1
) RETURNS TABLE(
  success BOOLEAN,
  new_balance INTEGER,
  already_owned BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_current_credits INTEGER;

  v_download_exists BOOLEAN;

  v_unlimited BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.racecard_downloads
    WHERE user_id = p_user_id
      AND racecard_id = p_racecard_id
  ) INTO v_download_exists;

  IF v_download_exists THEN
    SELECT credits INTO v_current_credits
    FROM public.credit_balances
    WHERE user_id = p_user_id;

    RETURN QUERY
    SELECT TRUE, COALESCE(v_current_credits, 0), TRUE;

    RETURN;
  END IF;

  SELECT cb.unlimited_credits
  INTO v_unlimited
  FROM public.credit_balances cb
  WHERE cb.user_id = p_user_id;

  IF COALESCE(v_unlimited, false) THEN
    SELECT credits INTO v_current_credits
    FROM public.credit_balances
    WHERE user_id = p_user_id;

    INSERT INTO public.racecard_downloads (user_id, racecard_id)
    VALUES (p_user_id, p_racecard_id);

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
      0,
      COALESCE(v_current_credits, 0),
      'download_deduction',
      p_racecard_id,
      jsonb_build_object('unlimited', true)
    );

    RETURN QUERY
    SELECT TRUE, COALESCE(v_current_credits, 0), FALSE;

    RETURN;
  END IF;

  UPDATE public.credit_balances
  SET credits = credits - p_required_credits,
      updated_at = now()
  WHERE user_id = p_user_id
    AND credits >= p_required_credits
  RETURNING credits INTO v_current_credits;

  IF FOUND THEN
    INSERT INTO public.racecard_downloads (user_id, racecard_id)
    VALUES (p_user_id, p_racecard_id);

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
      -p_required_credits,
      v_current_credits,
      'download_deduction',
      p_racecard_id,
      '{}'::jsonb
    );

    RETURN QUERY
    SELECT TRUE, v_current_credits, FALSE;
  ELSE
    RETURN QUERY
    SELECT FALSE, -1, FALSE;
  END IF;
END;
$$;
