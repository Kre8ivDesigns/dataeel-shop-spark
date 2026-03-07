
-- CRITICAL: Remove user self-update on credit_balances (prevents credit manipulation)
DROP POLICY "Users can update own balance" ON public.credit_balances;
CREATE POLICY "Only admins can update balances"
ON public.credit_balances FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- Add admin-only DELETE policies for account management
CREATE POLICY "Only admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete balances"
ON public.credit_balances FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Add INSERT policy for profiles (trigger handles creation, but policy needed)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
