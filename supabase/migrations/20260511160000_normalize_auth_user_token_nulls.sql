-- Supabase Auth expects these token fields to scan as strings during recover.
-- Legacy direct inserts into auth.users can leave newer token columns NULL.
DO $$
DECLARE
  token_column text;
BEGIN
  FOREACH token_column IN ARRAY ARRAY[
    'confirmation_token',
    'recovery_token',
    'email_change',
    'email_change_token_current',
    'email_change_token_new',
    'phone_change',
    'phone_change_token',
    'reauthentication_token'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'auth'
        AND table_name = 'users'
        AND column_name = token_column
    ) THEN
      EXECUTE format('UPDATE auth.users SET %I = '''' WHERE %I IS NULL', token_column, token_column);
    END IF;
  END LOOP;
END $$;
