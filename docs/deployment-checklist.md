# Deployment checklist

Use this when standing up or auditing an environment so **database, S3 files, Edge Functions, and app config** are aligned.

## 1. Database (Supabase Postgres)

- [ ] Apply all migrations from `supabase/migrations/` (local: `supabase db push`; hosted: CI or Dashboard SQL).
- [ ] If the API logs **404** / **PGRST205** on `GET /rest/v1/audit_log`, the `audit_log` table was never created on that project. Apply at least `20260310000000_security_hardening.sql` (creates `public.audit_log` + admin-read RLS), or run a full `supabase db push` so schema matches the app.
- [ ] Confirm extensions/policies match expectations: `racecards`, `racecards_public`, `metadata` columns, `site_content`, RLS on sensitive tables.
- [ ] **Auth**: email provider or SSO configured; site URL / redirect URLs set.

## 2. Primary file bucket (AWS S3)

- [ ] Bucket created; CORS allows your app origin if the browser ever talks to S3 directly (presigned PUT/GET usually avoids CORS issues when following redirects).
- [ ] IAM user/role with `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` on `racecards/*` (or bucket policy equivalent).
- [ ] Edge Function secrets (Supabase → Edge Functions → Secrets):
  - `AWS_S3_BUCKET`
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `RACECARD_DOWNLOAD_TZ` — IANA timezone for race-day download cutoff (default **`America/New_York`** if unset). Downloads stop at **local midnight after the calendar `race_date`** (next day 00:00 in this zone); `download-racecard` returns **403** after that for everyone, including prior purchasers.

## 3. Edge Functions

- [ ] Deploy all functions under `supabase/functions/` (no stray legacy endpoints). `supabase/config.toml` lists JWT expectations per function.
- [ ] Shared secrets:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (usually auto-injected; verify in dashboard).
  - `ALLOWED_ORIGINS` — comma-separated origins with scheme, no trailing slash (see `supabase/functions/_shared/cors.ts`).
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — fallback when Admin > Settings > Stripe is empty. Admins can now save both test and live key sets in the UI and flip modes via `stripe_mode`; the `resolveStripeConfig` helper prefers those values over the env secrets.
  - `APP_SETTINGS_ENCRYPTION_KEY` — **64+ hex chars** for `manage-app-settings` / AI key encryption / Stripe mode resolution.
- [ ] Optional: `SITE_PUBLIC_URL` for OpenRouter referrer header.
- [ ] Auth → Email Templates: paste `supabase/templates/*.html` into Supabase Dashboard → Authentication → Email Templates (Confirm signup, Reset password, Magic link). Supabase CLI picks them up automatically on `supabase db push` via the `[auth.email.template.*]` entries in `supabase/config.toml`.

| Function | Role |
|----------|------|
| `generate-upload-url` | Presigned S3 PUT (admin PDF upload) |
| `download-racecard` | Presigned S3 GET + credit RPC |
| `sync-s3-racecards` | List S3 `racecards/`, insert missing DB rows |
| `manage-app-settings` | Encrypted site + AI settings |
| `racing-assistant` | LLM chat; reads `site_content` + app_settings |
| `ai-admin` | Admin model list / connection tests |
| `abr-rss` | Proxies [ABR “The Sport” RSS](https://www.americasbestracing.net/the-sport/rss) for the homepage (CORS-safe); `verify_jwt = false`, fixed URL only |
| `tdn-rss` | Proxies [Thoroughbred Daily News](https://www.thoroughbreddailynews.com/feed/) main WordPress RSS; `verify_jwt = false`, fixed URL only |
| `equibase-late-changes-rss` | Proxies [Equibase static late-changes RSS](https://www.equibase.com/static/latechanges/rss/KD-USA.rss); `verify_jwt = false`. Optional secret **`EQUIBASE_LATE_CHANGES_BRN`** (default **`KD-USA`**, Keeneland) — e.g. `GP-USA`, `SA-USA`. Pattern: `{TRACK}-{COUNTRY}` |
| `create-checkout-session`, `stripe-webhook`, `customer-portal`, `list-invoices` | Stripe |
| `manage-credit-package` | Admin packages |
| `admin-create-user`, `admin-manage-user` | Admin user ops |

## 4. Frontend (Vercel / static host)

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` (anon)
- [ ] Optional: `VITE_RACECARD_DOWNLOAD_TZ` — same IANA zone as Edge `RACECARD_DOWNLOAD_TZ` so the browse UI disables downloads when the server would refuse them (defaults to **`America/New_York`** when omitted).
- [ ] Copy from `.env.example` for local dev; **never commit** `.env` (see `.gitignore`). If `.env` was ever committed, **rotate** the Supabase anon key and any other secrets that lived in that file.
- [ ] `vercel.json` CSP `connect-src` includes `https://*.amazonaws.com` so **presigned S3 PUT** from the admin uploader works in the browser.
- [ ] Production build: `npm run build` passes; smoke-test auth, `/racecards`, `/dashboard`, `/buy-credits`, admin routes.

### Production readiness (quick)

- [ ] CI green on `main` (GitHub Actions: install → build → test).
- [ ] Run through phased gates in `docs/build-checklist.md` for your release.

## 5. Operational data flow (sanity)

1. PDF lands in **S3** under `racecards/…`.
2. Row exists in **`racecards`** with `file_url` = that key; **`metadata`** JSON optional for site copy.
3. **`sync-s3-racecards`** or admin insert keeps DB ↔ S3 in sync.
4. Users see listings from **`racecards_public`** (cached in the browser via React Query).
5. Download uses **`download-racecard`** → presigned GET from **S3**.

## 6. Optional content overrides

- [ ] `site_content` row `racing_assistant_knowledge` — overrides bundled assistant knowledge (see `docs/data-layer.md`).
