
-- Fix profiles table: convert RESTRICTIVE to PERMISSIVE scoped to authenticated
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Only admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Fix credit_balances table
DROP POLICY IF EXISTS "Users can view own balance" ON public.credit_balances;
DROP POLICY IF EXISTS "Allow insert for own user or admin" ON public.credit_balances;
DROP POLICY IF EXISTS "Only admins can update balances" ON public.credit_balances;
DROP POLICY IF EXISTS "Only admins can delete balances" ON public.credit_balances;

CREATE POLICY "Users can view own balance" ON public.credit_balances FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Allow insert for own user or admin" ON public.credit_balances FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Only admins can update balances" ON public.credit_balances FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Only admins can delete balances" ON public.credit_balances FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Fix user_roles table
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Only admins can manage roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Fix transactions table
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Users can create transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
