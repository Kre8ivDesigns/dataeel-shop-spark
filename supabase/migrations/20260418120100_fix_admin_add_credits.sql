-- Fix Admin > Give Credits: the original admin_add_credits only does UPDATE
-- (so it silently no-ops when the user has no credit_balances row) and lacks
-- SECURITY DEFINER, so the caller's RLS blocks the write. Replace with an
-- upsert and pin search_path.

CREATE OR REPLACE FUNCTION public.admin_add_credits(_user_id uuid, _amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'You must be an admin to perform this action';
  END IF;

  IF _amount IS NULL OR _amount = 0 THEN
    RAISE EXCEPTION 'Amount must be non-zero';
  END IF;

  INSERT INTO public.credit_balances (user_id, credits)
  VALUES (_user_id, _amount)
  ON CONFLICT (user_id) DO UPDATE
    SET credits = public.credit_balances.credits + EXCLUDED.credits
  RETURNING credits INTO new_balance;

  RETURN new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_add_credits(uuid, integer) TO authenticated;
