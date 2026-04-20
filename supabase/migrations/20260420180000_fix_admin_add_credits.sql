-- Fix admin_add_credits: replace the indirect call to add_credits_atomic (which has
-- REVOKE ALL FROM PUBLIC) with inline logic.  Re-assert the EXECUTE grant so
-- PostgREST can invoke the function via the authenticated role.

CREATE OR REPLACE FUNCTION public.admin_add_credits(
  _user_id uuid,
  _amount  integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller  uuid;
  v_balance integer;
BEGIN
  -- Capture calling user's ID from the session JWT
  v_caller := auth.uid();

  IF v_caller IS NULL OR NOT public.is_admin(v_caller) THEN
    RAISE EXCEPTION 'You must be an admin to perform this action';
  END IF;

  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Upsert the credit balance row
  INSERT INTO public.credit_balances (user_id, credits)
  VALUES (_user_id, _amount)
  ON CONFLICT (user_id) DO UPDATE
    SET credits    = public.credit_balances.credits + EXCLUDED.credits,
        updated_at = now();

  -- Read the resulting balance
  SELECT credits INTO v_balance
  FROM public.credit_balances
  WHERE user_id = _user_id;

  -- Append an audit row to the credit ledger
  INSERT INTO public.credit_ledger (user_id, delta, balance_after, entry_type, ref_id, meta)
  VALUES (
    _user_id,
    _amount,
    v_balance,
    'admin_grant',
    NULL,
    jsonb_build_object('admin_id', v_caller)
  );

  RETURN v_balance;
END;
$$;

-- Re-assert execute permission so the browser client (authenticated role) can
-- invoke this function via PostgREST.
GRANT EXECUTE ON FUNCTION public.admin_add_credits(uuid, integer) TO authenticated;
