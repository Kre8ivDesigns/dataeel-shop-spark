-- Seed the existing hardcoded credit packages into the database.
-- Only inserts if the table is empty to avoid duplicate seeding.
INSERT INTO public.credit_packages (name, description, credits, price, stripe_price_id)
SELECT name, description, credits, price, stripe_price_id
FROM (VALUES
  ('Single',      'Try us out',                    1,   5.00, 'price_1T5TJoI2kIUOizBRFylaVi9V'),
  ('Starter',     'Perfect for casual race days',  5,  20.00, 'price_1T5TM0I2kIUOizBRqvb18FTH'),
  ('Best Value',  'Most popular choice',          15,  50.00, 'price_1T5TMNI2kIUOizBRYHSZUcQM'),
  ('Pro',         'For serious handicappers',     40, 100.00, 'price_1T5TaDI2kIUOizBR807We5Dz'),
  ('Season Pass', 'Ultimate value for regulars', 100, 200.00, 'price_1T5TaRI2kIUOizBRXKDPWShk')
) AS t(name, description, credits, price, stripe_price_id)
WHERE NOT EXISTS (SELECT 1 FROM public.credit_packages LIMIT 1);
