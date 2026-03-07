
CREATE OR REPLACE FUNCTION public.deduct_credit_if_sufficient(
  p_user_id UUID,
  p_racecard_id UUID,
  p_required_credits INTEGER DEFAULT 1
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, already_owned BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits INTEGER;
  v_download_exists BOOLEAN;
BEGIN
  -- Check if already downloaded
  SELECT EXISTS(
    SELECT 1 FROM racecard_downloads
    WHERE user_id = p_user_id AND racecard_id = p_racecard_id
  ) INTO v_download_exists;

  IF v_download_exists THEN
    SELECT credits INTO v_current_credits
    FROM credit_balances WHERE user_id = p_user_id;
    RETURN QUERY SELECT TRUE, COALESCE(v_current_credits, 0), TRUE;
    RETURN;
  END IF;

  -- Atomic check and deduct with row lock
  UPDATE credit_balances
  SET credits = credits - p_required_credits, updated_at = now()
  WHERE user_id = p_user_id AND credits >= p_required_credits
  RETURNING credits INTO v_current_credits;

  IF FOUND THEN
    INSERT INTO racecard_downloads (user_id, racecard_id)
    VALUES (p_user_id, p_racecard_id);
    RETURN QUERY SELECT TRUE, v_current_credits, FALSE;
  ELSE
    RETURN QUERY SELECT FALSE, -1, FALSE;
  END IF;
END;
$$;
