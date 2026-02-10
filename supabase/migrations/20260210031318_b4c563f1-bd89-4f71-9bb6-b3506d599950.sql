
-- Allow system/admin to insert credit balances (needed for user registration trigger and admin operations)
CREATE POLICY "Allow insert for own user or admin"
ON public.credit_balances
FOR INSERT
WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));
