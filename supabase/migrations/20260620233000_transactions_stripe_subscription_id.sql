ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS transactions_stripe_subscription_id_idx
  ON public.transactions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
