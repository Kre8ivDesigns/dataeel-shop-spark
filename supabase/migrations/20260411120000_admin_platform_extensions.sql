-- Credit ledger (append-only), contact queue, safer add_credits_atomic grants,
-- CMS publish fields, and published-only public page reads.

-- ── credit_ledger ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN ('purchase', 'admin_grant', 'download_deduction', 'adjustment')
  ),
  ref_id UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON public.credit_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created_at ON public.credit_ledger (created_at DESC);

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read credit ledger"
  ON public.credit_ledger FOR SELECT TO authenticated
  USING (public.is_admin (auth.uid ()));

-- ── contact_submissions ─────────────────────────────────────────────────────
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

-- ── pages: publish & SEO ───────────────────────────────────────────────────
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS meta_description TEXT;

DROP POLICY IF EXISTS "Everyone can view pages" ON public.pages;

CREATE POLICY "Public can view published pages"
  ON public.pages FOR SELECT
  USING (published = true OR public.is_admin (auth.uid ()));

-- ── Replace add_credits_atomic (ledger + lock down EXECUTE) ────────────────
DROP FUNCTION IF EXISTS public.admin_grant_credits (uuid, int);

DROP FUNCTION IF EXISTS public.add_credits_atomic (uuid, int);

CREATE OR REPLACE FUNCTION public.add_credits_atomic (
  p_user_id UUID,
  p_credits INT,
  p_entry_type TEXT DEFAULT 'adjustment',
  p_ref_id UUID DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public AS $$
DECLARE
  v_balance INT;
BEGIN
  IF p_credits = 0 THEN
    RETURN;
  END IF;

  IF p_entry_type NOT IN ('purchase', 'admin_grant', 'download_deduction', 'adjustment') THEN
    RAISE EXCEPTION 'Invalid entry_type';
  END IF;

  INSERT INTO
    credit_balances (user_id, credits)
  VALUES
    (p_user_id, p_credits)
  ON CONFLICT (user_id) DO UPDATE SET
    credits = credit_balances.credits + EXCLUDED.credits,
    updated_at = now();

  SELECT credits INTO v_balance FROM credit_balances WHERE user_id = p_user_id;

  INSERT INTO credit_ledger (
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

-- Optional internal grant path for SECURITY DEFINER callers is implicit (same owner).

CREATE OR REPLACE FUNCTION public.admin_grant_credits (p_user_id UUID, p_credits INT) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public AS $$
BEGIN
  IF NOT public.is_admin (auth.uid ()) THEN
    RAISE EXCEPTION 'Access denied: caller is not an admin';
  END IF;

  IF p_credits <= 0 THEN
    RAISE EXCEPTION 'Credits must be a positive integer';
  END IF;

  PERFORM public.add_credits_atomic (
    p_user_id,
    p_credits,
    'adjustment',
    NULL,
    jsonb_build_object ('via', 'admin_grant_credits')
  );
END;
$$;

-- admin_add_credits: use atomic + ledger (still checks is_admin via non-definer path — re-check)
CREATE OR REPLACE FUNCTION public.admin_add_credits (_user_id uuid, _amount integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public AS $$
DECLARE
  v_caller uuid := auth.uid ();
 v_balance int;
BEGIN
  IF v_caller IS NULL OR NOT public.is_admin (v_caller) THEN
    RAISE EXCEPTION 'You must be an admin to perform this action';
  END IF;

  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Delegate to add_credits_atomic (same owner; executes with definer rights)
  PERFORM public.add_credits_atomic (
    _user_id,
    _amount,
    'admin_grant',
    NULL,
    jsonb_build_object ('admin_id', v_caller::text)
  );

  SELECT credits INTO v_balance FROM credit_balances WHERE user_id = _user_id;

  RETURN v_balance;
END;
$$;

-- Deduct credits: append ledger row on successful deduction
CREATE OR REPLACE FUNCTION public.deduct_credit_if_sufficient (
  p_user_id UUID,
  p_racecard_id UUID,
  p_required_credits INTEGER DEFAULT 1
) RETURNS TABLE(
  success BOOLEAN,
  new_balance INTEGER,
  already_owned BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER
SET
  search_path = public AS $$
DECLARE
  v_current_credits INTEGER;

  v_download_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT
      1
    FROM
      racecard_downloads
    WHERE
      user_id = p_user_id
      AND racecard_id = p_racecard_id
  ) INTO v_download_exists;

  IF v_download_exists THEN
    SELECT
      credits INTO v_current_credits
    FROM
      credit_balances
    WHERE
      user_id = p_user_id;

    RETURN QUERY
    SELECT
      TRUE,
      COALESCE(v_current_credits, 0),
      TRUE;

    RETURN;
  END IF;

  UPDATE credit_balances
  SET
    credits = credits - p_required_credits,
    updated_at = now()
  WHERE
    user_id = p_user_id
    AND credits >= p_required_credits
  RETURNING
    credits INTO v_current_credits;

  IF FOUND THEN
    INSERT INTO racecard_downloads (user_id, racecard_id)
    VALUES (p_user_id, p_racecard_id);

    INSERT INTO credit_ledger (
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
    SELECT
      TRUE,
      v_current_credits,
      FALSE;
  ELSE
    RETURN QUERY
    SELECT
      FALSE,
      -1,
      FALSE;
  END IF;
END;
$$;
