-- Fallback for imported Auth rows that Supabase Auth Admin API cannot load/delete.
-- This is intentionally service-role only and is called after app-side cleanup.

CREATE OR REPLACE FUNCTION public.admin_force_delete_auth_user (_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_rows integer;
BEGIN
  DELETE FROM auth.users
  WHERE id = _user_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_force_delete_auth_user (uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_force_delete_auth_user (uuid) TO service_role;
