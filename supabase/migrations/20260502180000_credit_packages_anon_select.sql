-- Public marketing pages and unauthenticated users need to read package rows for display.
CREATE POLICY "Anon can view credit packages"
ON public.credit_packages FOR SELECT
TO anon
USING (true);
