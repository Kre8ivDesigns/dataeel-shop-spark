
-- Drop and recreate profiles SELECT policy with explicit auth check
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR is_admin(auth.uid())));

-- Drop and recreate transactions SELECT policy with explicit auth check
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR is_admin(auth.uid())));

-- Also harden transactions INSERT policy
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;
CREATE POLICY "Users can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
