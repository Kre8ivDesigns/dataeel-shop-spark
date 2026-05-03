-- Admin-only RPC to assign or revoke unlimited RaceCard credits (mirrors admin_add_credits security).

CREATE OR REPLACE FUNCTION public.admin_set_unlimited_credits (
  _user_id uuid,
  _unlimited boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller  uuid;
  v_balance integer;
BEGIN
  v_caller := auth.uid();

  IF v_caller IS NULL OR NOT public.is_admin (v_caller) THEN
    RAISE EXCEPTION 'You must be an admin to perform this action';
  END IF;

  INSERT INTO public.credit_balances (user_id, credits, unlimited_credits)
  VALUES (_user_id, 0, _unlimited)
  ON CONFLICT (user_id) DO UPDATE SET
    unlimited_credits = EXCLUDED.unlimited_credits,
    updated_at = now();

  SELECT credits INTO v_balance
  FROM public.credit_balances
  WHERE user_id = _user_id;

  INSERT INTO public.credit_ledger (user_id, delta, balance_after, entry_type, ref_id, meta)
  VALUES (
    _user_id,
    0,
    COALESCE (v_balance, 0),
    'admin_grant',
    NULL,
    jsonb_build_object('admin_id', v_caller, 'unlimited_credits', _unlimited)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_unlimited_credits (uuid, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_set_unlimited_credits (uuid, boolean) TO authenticated;
