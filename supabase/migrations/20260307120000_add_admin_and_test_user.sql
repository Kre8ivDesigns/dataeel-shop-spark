
-- Create the admin user
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  '',
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User"}',
  NOW(),
  NOW(),
  '',
  '',
  NULL
);

-- Create the test user
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a3e7b2f0-5b2f-4b4f-8b1a-9b1c0c1d2e3f',
  'authenticated',
  'authenticated',
  'user@example.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  '',
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Test User"}',
  NOW(),
  NOW(),
  '',
  '',
  NULL
);

-- The trigger automatically creates a 'user' role. Update the admin's role to 'admin'.
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- Manually set credit balance since the trigger only sets it to 0
UPDATE public.credit_balances
SET credits = 100
WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

UPDATE public.credit_balances
SET credits = 10
WHERE user_id = 'a3e7b2f0-5b2f-4b4f-8b1a-9b1c0c1d2e3f';
