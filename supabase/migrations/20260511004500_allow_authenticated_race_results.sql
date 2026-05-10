DROP POLICY IF EXISTS "Admins and purchasers can read race results" ON public.race_results;
DROP POLICY IF EXISTS "Authenticated users can read race results" ON public.race_results;

CREATE POLICY "Authenticated users can read race results"
ON public.race_results
FOR SELECT
TO authenticated
USING (true);
