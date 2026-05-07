-- Admin-only cleanup for removing pre-launch/test transaction rows.

CREATE OR REPLACE FUNCTION public.admin_delete_transactions_before (_cutoff timestamptz)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_deleted integer;
BEGIN
  v_caller := auth.uid();

  IF v_caller IS NULL OR NOT public.is_admin(v_caller) THEN
    RAISE EXCEPTION 'You must be an admin to perform this action';
  END IF;

  DELETE FROM public.transactions
  WHERE created_at < _cutoff;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  INSERT INTO public.audit_log (actor_id, action, resource, resource_id, detail)
  VALUES (
    v_caller,
    'transactions.cleanup_before_cutoff',
    'transactions',
    NULL,
    jsonb_build_object('cutoff', _cutoff, 'deleted', v_deleted)
  );

  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_transactions_before (timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_delete_transactions_before (timestamptz) TO authenticated;
