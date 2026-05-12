-- Feedback-for-credit offers for registered users who have not purchased credits.

ALTER TABLE public.credit_ledger
  DROP CONSTRAINT IF EXISTS credit_ledger_entry_type_check;

ALTER TABLE public.credit_ledger
  ADD CONSTRAINT credit_ledger_entry_type_check
  CHECK (
    entry_type IN ('purchase', 'admin_grant', 'download_deduction', 'adjustment', 'feedback_credit')
  );

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

  IF p_entry_type NOT IN ('purchase', 'admin_grant', 'download_deduction', 'adjustment', 'feedback_credit') THEN
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

CREATE TABLE IF NOT EXISTS public.feedback_credit_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  offer_token UUID NOT NULL DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'signup_no_purchase',
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  credited_at TIMESTAMPTZ,
  response_message TEXT,
  credit_amount INTEGER NOT NULL DEFAULT 1 CHECK (credit_amount = 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (offer_token),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_credit_offers_user_id
  ON public.feedback_credit_offers (user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_credit_offers_offer_token
  ON public.feedback_credit_offers (offer_token);

ALTER TABLE public.feedback_credit_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own feedback credit offer"
  ON public.feedback_credit_offers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can read feedback credit offers"
  ON public.feedback_credit_offers FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_feedback_credit_offers_updated_at
BEFORE UPDATE ON public.feedback_credit_offers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.claim_feedback_credit (
  p_offer_token UUID,
  p_message TEXT
) RETURNS TABLE(
  credited BOOLEAN,
  new_balance INTEGER,
  already_claimed BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_offer public.feedback_credit_offers%ROWTYPE;
  v_balance INTEGER;
  v_completed_purchase_count INTEGER;
  v_message TEXT := trim(COALESCE(p_message, ''));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF char_length(v_message) < 10 THEN
    RAISE EXCEPTION 'Feedback must be at least 10 characters';
  END IF;

  IF char_length(v_message) > 5000 THEN
    RAISE EXCEPTION 'Feedback must be 5000 characters or less';
  END IF;

  SELECT *
  INTO v_offer
  FROM public.feedback_credit_offers
  WHERE
    user_id = v_user_id
    AND (
      offer_token = p_offer_token
      OR p_offer_token IS NULL
    )
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    IF p_offer_token IS NOT NULL THEN
      RAISE EXCEPTION 'Feedback offer not found';
    END IF;

    SELECT email
    INTO v_offer.email
    FROM public.profiles
    WHERE user_id = v_user_id;

    IF v_offer.email IS NULL THEN
      RAISE EXCEPTION 'Feedback offer not found';
    END IF;

    INSERT INTO public.feedback_credit_offers (user_id, email, source)
    VALUES (v_user_id, v_offer.email, 'website_feedback')
    RETURNING * INTO v_offer;
  END IF;

  IF v_offer.credited_at IS NOT NULL THEN
    SELECT credits INTO v_balance FROM public.credit_balances WHERE user_id = v_user_id;
    RETURN QUERY SELECT FALSE, COALESCE(v_balance, 0), TRUE;
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_completed_purchase_count
  FROM public.transactions
  WHERE
    user_id = v_user_id
    AND lower(status) IN ('completed', 'paid', 'succeeded');

  IF v_completed_purchase_count > 0 THEN
    RAISE EXCEPTION 'Feedback credit is only available before your first purchase';
  END IF;

  UPDATE public.feedback_credit_offers
  SET
    responded_at = now(),
    response_message = v_message
  WHERE id = v_offer.id;

  INSERT INTO public.contact_submissions (
    name,
    email,
    category,
    subject,
    message,
    user_id,
    status
  )
  SELECT
    COALESCE(NULLIF(trim(p.full_name), ''), 'DATAEEL user'),
    p.email,
    'feedback_credit',
    'Feedback credit response',
    v_message,
    v_user_id,
    'open'
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  PERFORM public.add_credits_atomic (
    v_user_id,
    1,
    'feedback_credit',
    v_offer.id,
    jsonb_build_object('source', v_offer.source, 'offer_token', v_offer.offer_token::text)
  );

  UPDATE public.feedback_credit_offers
  SET credited_at = now()
  WHERE id = v_offer.id;

  SELECT credits INTO v_balance FROM public.credit_balances WHERE user_id = v_user_id;

  RETURN QUERY SELECT TRUE, COALESCE(v_balance, 0), FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_feedback_credit (uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_feedback_credit (uuid, text) TO authenticated;
