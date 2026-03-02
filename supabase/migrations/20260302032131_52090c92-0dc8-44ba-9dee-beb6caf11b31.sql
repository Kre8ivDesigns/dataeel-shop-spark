
-- Fix 1: Tighten profiles SELECT policy to only allow own profile or admin
DROP POLICY "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING ((user_id = auth.uid()) OR is_admin(auth.uid()));

-- Fix 2: Remove self-insert on racecard_downloads (only service role / admin should insert)
DROP POLICY "Service role can insert downloads" ON public.racecard_downloads;
CREATE POLICY "Only admins can insert downloads"
  ON public.racecard_downloads FOR INSERT
  WITH CHECK (is_admin(auth.uid()));
