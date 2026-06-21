ALTER TABLE public.credit_balances
  ADD COLUMN IF NOT EXISTS unlimited_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.credit_balances.unlimited_expires_at IS
  'Optional expiration for legacy one-time unlimited access. NULL means no date-based expiry, used for active Stripe subscriptions and admin grants.';

UPDATE public.credit_balances cb
SET
  unlimited_expires_at = legacy.expires_at,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (t.user_id)
    t.user_id,
    t.created_at + interval '1 month' AS expires_at
  FROM public.transactions t
  WHERE t.unlimited_credits = true
    AND t.status = 'completed'
    AND t.stripe_subscription_id IS NULL
  ORDER BY t.user_id, t.created_at DESC
) legacy
WHERE cb.user_id = legacy.user_id
  AND cb.unlimited_credits = true;

UPDATE public.credit_balances
SET
  unlimited_credits = false,
  updated_at = now()
WHERE unlimited_credits = true
  AND unlimited_expires_at IS NOT NULL
  AND unlimited_expires_at <= now();

CREATE OR REPLACE FUNCTION public.expire_legacy_unlimited_credits()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.credit_balances
  SET
    unlimited_credits = false,
    updated_at = now()
  WHERE unlimited_credits = true
    AND unlimited_expires_at IS NOT NULL
    AND unlimited_expires_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_legacy_unlimited_credits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_legacy_unlimited_credits() FROM anon;
REVOKE ALL ON FUNCTION public.expire_legacy_unlimited_credits() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_legacy_unlimited_credits() TO service_role;

DO $$
DECLARE
  job record;
BEGIN
  FOR job IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'expire-legacy-unlimited-credits-hourly'
  LOOP
    PERFORM cron.unschedule(job.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'expire-legacy-unlimited-credits-hourly',
  '5 * * * *',
  $$ SELECT public.expire_legacy_unlimited_credits(); $$
);

CREATE OR REPLACE FUNCTION public.grant_unlimited_credits_atomic (
  p_user_id UUID,
  p_ref_id UUID,
  p_meta JSONB DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_balance INT;
BEGIN
  INSERT INTO public.credit_balances (user_id, credits, unlimited_credits, unlimited_expires_at)
  VALUES (p_user_id, 0, true, NULL)
  ON CONFLICT (user_id) DO UPDATE SET
    unlimited_credits = true,
    unlimited_expires_at = NULL,
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

  UPDATE public.credit_balances
  SET
    unlimited_credits = false,
    updated_at = now()
  WHERE user_id = p_user_id
    AND unlimited_credits = true
    AND unlimited_expires_at IS NOT NULL
    AND unlimited_expires_at <= now();

  SELECT cb.unlimited_credits
    AND (cb.unlimited_expires_at IS NULL OR cb.unlimited_expires_at > now())
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
