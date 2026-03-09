-- App settings table: stores encrypted key-value pairs.
-- Only the service-role (edge functions) can access rows — no user-facing RLS policies.
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  encrypted_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Intentionally no SELECT/INSERT/UPDATE/DELETE policies for authenticated/anon roles.
-- Access is only via service-role client inside edge functions.
