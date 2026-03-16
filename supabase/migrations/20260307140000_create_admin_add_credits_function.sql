CREATE OR REPLACE FUNCTION public.admin_add_credits(_user_id uuid, _amount integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'You must be an admin to perform this action';
  END IF;

  UPDATE public.credit_balances
  SET credits = credits + _amount
  WHERE user_id = _user_id;

  RETURN (SELECT credits FROM public.credit_balances WHERE user_id = _user_id);
END;
$$;