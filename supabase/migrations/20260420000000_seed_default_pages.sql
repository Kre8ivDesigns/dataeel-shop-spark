-- Seed default public-site pages so the Admin > Pages list is never empty on a fresh install.
-- Uses ON CONFLICT (slug) DO NOTHING so existing custom content is never overwritten.
-- Depends on: the UNIQUE constraint on pages.slug introduced in migration
--   20260307150000_create_pages_table.sql (slug TEXT UNIQUE NOT NULL).

INSERT INTO public.pages (slug, title, html, css, published, meta_description, created_at, updated_at)
VALUES
  (
    'homepage',
    'Home',
    '<section class="hero"><h1>Welcome to DataEel</h1><p>Your premier racing data and analysis platform.</p></section>',
    '',
    false,
    'DataEel – race data and analysis platform.',
    now(),
    now()
  ),
  (
    'about',
    'About Us',
    '<section><h1>About DataEel</h1><p>Tell your story here.</p></section>',
    '',
    false,
    'Learn more about DataEel and our mission.',
    now(),
    now()
  ),
  (
    'pricing',
    'Pricing',
    '<section><h1>Pricing</h1><p>Choose a plan that works for you.</p></section>',
    '',
    false,
    'DataEel pricing plans and credit packages.',
    now(),
    now()
  ),
  (
    'terms',
    'Terms of Service',
    '<section><h1>Terms of Service</h1><p>Please read these terms carefully before using DataEel.</p></section>',
    '',
    false,
    'DataEel terms of service and usage policy.',
    now(),
    now()
  ),
  (
    'privacy',
    'Privacy Policy',
    '<section><h1>Privacy Policy</h1><p>How we collect, use, and protect your data.</p></section>',
    '',
    false,
    'DataEel privacy policy and data handling.',
    now(),
    now()
  )
ON CONFLICT (slug) DO NOTHING;
