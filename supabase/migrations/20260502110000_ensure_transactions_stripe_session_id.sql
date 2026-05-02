-- Repair deployments where 20260310000000_security_hardening did not run:
-- list-invoices and stripe-webhook require transactions.stripe_session_id.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_stripe_session_id_key
  ON public.transactions (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
