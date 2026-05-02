-- Align pages table with the admin Page Editor UI and seed default public pages.
-- The generated TypeScript types already declare title/published/meta_description,
-- but earlier migrations never added them. Without these columns the Page Editor
-- throws on load (selects non-existent columns) and Admin > Pages stays empty.

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS meta_description text;

CREATE INDEX IF NOT EXISTS idx_pages_published_slug
  ON public.pages (published, slug);

-- Seed default public pages so Admin > Pages isn't empty on a fresh install.
-- Slugs mirror the app's public routes; HTML/CSS are intentionally empty so the
-- editor shows a blank canvas that admins can fill in.
INSERT INTO public.pages (slug, title, html, css, published, meta_description)
VALUES
  ('home',       'Home',            '', '', true, 'DATAEEL — racing intelligence and racecards.'),
  ('about',      'About',           '', '', true, 'About DATAEEL.'),
  ('pricing',    'Pricing',         '', '', true, 'Credit packages and pricing.'),
  ('contact',    'Contact',         '', '', true, 'Contact DATAEEL support.'),
  ('terms',      'Terms of Service','', '', true, 'Terms governing use of the service.'),
  ('privacy',    'Privacy Policy',  '', '', true, 'How we collect and use your information.'),
  ('disclaimer', 'Disclaimer',      '', '', true, 'Legal disclaimer for racing content.')
ON CONFLICT (slug) DO NOTHING;
