-- CRIT-01: Remove hardcoded test credentials seeded in migration 20260307120000.
-- These accounts had trivially guessable passwords ('password') and well-known UUIDs.
-- IMPORTANT: Before applying to production, ensure you have a working admin account
-- with a strong password. Create one via the Supabase Auth dashboard first.
--
-- This migration disables the two hardcoded accounts by setting them to require
-- email confirmation again. If you rely on admin@example.com for production access,
-- create a new admin account first, then apply this migration.

UPDATE auth.users
SET email_confirmed_at = NULL,
    recovery_token = encode(gen_random_bytes(32), 'hex'),
    updated_at = now()
WHERE id IN (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479', -- admin@example.com
  'a3e7b2f0-5b2f-4b4f-8b1a-9b1c0c1d2e3f'  -- user@example.com
);

-- If you are certain these accounts are not needed in production, instead run:
-- DELETE FROM auth.users
-- WHERE id IN ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'a3e7b2f0-5b2f-4b4f-8b1a-9b1c0c1d2e3f');
