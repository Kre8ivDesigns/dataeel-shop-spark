-- Per-user aggregate estimated AI spend (USD) per UTC calendar day for racing-assistant.
-- Written only by the racing-assistant Edge Function (service role).

CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  spend_usd NUMERIC(14, 8) NOT NULL DEFAULT 0 CHECK (spend_usd >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS ai_usage_daily_usage_date_idx ON public.ai_usage_daily (usage_date);

ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ai_usage_daily IS 'Per-user AI chat estimated spend (USD) per UTC day; updated by racing-assistant.';

CREATE OR REPLACE FUNCTION public.increment_ai_usage_daily(
  p_user_id UUID,
  p_usage_date DATE,
  p_delta_usd NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_delta_usd IS NULL OR p_delta_usd < 0 THEN
    RAISE EXCEPTION 'increment_ai_usage_daily: invalid delta';
  END IF;
  INSERT INTO public.ai_usage_daily (user_id, usage_date, spend_usd)
  VALUES (p_user_id, p_usage_date, p_delta_usd)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    spend_usd = public.ai_usage_daily.spend_usd + EXCLUDED.spend_usd,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_ai_usage_daily(UUID, DATE, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage_daily(UUID, DATE, NUMERIC) TO service_role;
