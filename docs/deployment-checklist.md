# Deployment checklist

Use this when standing up or auditing an environment so **database, S3 files, Edge Functions, and app config** are aligned.

## 1. Database (Supabase Postgres)

- [ ] Apply all migrations from `supabase/migrations/` (local: `supabase db push`; hosted: CI or Dashboard SQL).
- [ ] If the API logs **404** / **PGRST205** on `GET /rest/v1/audit_log`, the `audit_log` table was never created on that project. Apply at least `20260310000000_security_hardening.sql` (creates `public.audit_log` + admin-read RLS), or run a full `supabase db push` so schema matches the app.
- [ ] Confirm extensions/policies match expectations: `racecards`, `racecards_public`, `metadata` columns, `site_content`, RLS on sensitive tables.
- [ ] **Auth**
  - [ ] **Authentication → URL Configuration**: **Site URL** = canonical app URL (e.g. `https://www.thedataeel.com`). **Redirect URLs** includes that origin, bare domain if used, `http://localhost:8080` for local Vite, and preview origins if you test auth there.
  - [ ] **Authentication → SMTP**: custom SMTP here sends **all Auth emails** (confirm signup, reset password). **Admin → Settings → SMTP** in the web app is separate (Edge/test mail only).
  - [ ] **Authentication → Email Templates**: paste HTML from `supabase/templates/` — **Confirm signup** = **`confirm-signup.html`** (matches `[auth.email.template.confirmation]` in `supabase/config.toml`). See `supabase/templates/README.md`.

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
- [ ] Auth → Email Templates: paste templates listed in `supabase/config.toml` (`confirm-signup.html`, `reset-password.html`, `magic-link.html`). Confirm signup must use **`confirm-signup.html`**, not the legacy `confirmation.html`, unless you change both Dashboard and `config.toml`. Local `supabase start` uses `config.toml`; hosted projects use Dashboard copies.

| Function | Role |
|----------|------|
| `generate-upload-url` | Presigned S3 PUT (admin PDF upload) |
| `download-racecard` | Presigned S3 GET + credit RPC |
| `sync-s3-racecards` | List S3 `racecards/`, insert missing DB rows |
| `manage-app-settings` | Encrypted site + AI settings |
| `racing-assistant` | LLM chat; reads `site_content` + app_settings |
| `ai-admin` | Admin model list / connection tests |
| `abr-rss` | Proxies [ABR “The Sport” RSS](https://www.americasbestracing.net/rss/the-sport) for the homepage (CORS-safe); `verify_jwt = false`, fixed URL only |
| `tdn-rss` | Proxies [Thoroughbred Daily News](https://www.thoroughbreddailynews.com/feed/) main WordPress RSS; `verify_jwt = false`, fixed URL only |
| `equibase-late-changes-rss` | Proxies [Equibase static late-changes RSS](https://www.equibase.com/static/latechanges/rss/KD-USA.rss); `verify_jwt = false`. Optional secret **`EQUIBASE_LATE_CHANGES_BRN`** (default **`KD-USA`**, Keeneland) — e.g. `GP-USA`, `SA-USA`. Pattern: `{TRACK}-{COUNTRY}` |
| `create-checkout-session`, `stripe-webhook`, `customer-portal`, `list-invoices` | Stripe |

**Stripe webhooks (Dashboard → Developers → Webhooks, same mode as your keys: test `whsec_...` for test, live for production):**

- **Endpoint URL:** `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` (must match the project in `VITE_SUPABASE_URL`).
- **Required events (minimum):** `checkout.session.completed`, `invoice.paid`, and **`checkout.session.async_payment_succeeded`** if you accept deferred / async payment methods (without it, `checkout.session.completed` may arrive with `payment_status: unpaid` and credits are only applied when the async event fires).
- **Test vs live:** The signing secret in Stripe Dashboard must match the mode in **Admin → Settings** (`stripe_mode`) or your env fallbacks: use **Test** webhooks with `whsec_…` from the test destination and `stripe_test_*` / `sk_test_` keys; use **Live** with live secrets. A mismatch yields **400 Invalid signature** (not silent). Missing keys yield **503** from `stripe-webhook` (`Stripe API key not configured` / `Webhook signing secret not configured`).
- **Not required for this app:** `payment_intent.succeeded` (logic uses checkout + invoice events). If the endpoint was never called, check **Recent deliveries** in the Stripe dashboard, **test vs live** key alignment with Admin → Settings `stripe_mode`, and Supabase **Edge Functions → stripe-webhook** logs.

**Stripe: HTTP 200 does not always mean credits were granted.** The webhook intentionally returns **200** for many outcomes so Stripe does not endless-retry non-fixable cases (e.g. unpaid session, missing metadata, duplicate idempotency). **Inspect the JSON response body**, not only the status code: look for `fulfilled`, `skipped`, `reason`, and `duplicate`. Example: `skipped: true` with `reason: "payment_not_final"` means no credits until `checkout.session.async_payment_succeeded` or payment completes. **Developers → Webhooks → [your endpoint] → select a delivery → Response** shows this body. That view is **not** the same as **Developers → API logs** (those are API requests you made to Stripe, not incoming webhook deliveries).

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
