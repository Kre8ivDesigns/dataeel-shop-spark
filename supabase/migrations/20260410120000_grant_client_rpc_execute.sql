-- PostgreSQL 15+ does not grant EXECUTE on new functions to PUBLIC by default.
-- Without these grants, PostgREST cannot invoke the RPCs from the browser and
-- admin checks (is_admin) always fail, so admins cannot access /admin routes.

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_credits(uuid, integer) TO authenticated;
