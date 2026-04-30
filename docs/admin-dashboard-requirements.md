# Admin dashboard — requirements checklist

This document is the **source of truth for verification**: what exists in the product today, what is partial, and what is missing to run the business from the admin area. Update it when you ship or deprecate features.

**How to use**

- **Built** — Implemented in the app (route or main dashboard) and wired to real data or settings where applicable.
- **Partial** — UI or backend exists but is thin, manual, or not end-to-end for operations.
- **Missing** — No first-class admin (or product) support; typically needs schema, APIs, and UI.
- **N/A / external** — Handled outside this app (e.g. Stripe Dashboard, email client).

Last reviewed against the codebase: **2026-04-11**.

---

## 1. Navigation and access control

| Requirement | Status | Notes |
|-------------|--------|--------|
| Admin-only routes | **Built** | `ProtectedRoute` + `requireAdmin`; routes under `/admin/*` in `App.tsx`. |
| Role model | **Built** | `user_roles`, `app_role` enum; `is_admin` RPC used in `AuthContext` and dashboard. |
| Session / re-verify on sensitive pages | **Partial** | Main dashboard re-calls `is_admin`; sub-pages rely on `isAdmin` from context only. |
| Multi-admin / staff roles (e.g. support-only) | **Missing** | Only `admin` vs `user`; no granular permissions. |
| Audit of admin logins | **Missing** | `audit_log` exists for app actions; dedicated “who accessed admin” trail not documented here. |

---

## 2. Executive overview (home)

| Requirement | Status | Notes |
|-------------|--------|--------|
| KPI snapshot (users, orders, racecards, revenue) | **Built** | `AdminDashboard.tsx` stats cards. |
| Quick links to deep areas | **Built** | Financials, Analytics, Settings, Credit packages, Page editor. |
| Customers list with credits | **Built** | Merged `profiles` + `credit_balances`; search, create user, give credits. |
| Transactions list | **Built** | Tab with package, credits, amount, status, Stripe session id. |
| Racecards CRUD (upload, S3 sync, delete) | **Built** | Edge functions `generate-upload-url`, `sync-s3-racecards`. |
| Refresh all data | **Built** | “Refresh data” button. |
| Customizable dashboard widgets / saved views | **Missing** | — |
| Alerts (failed webhooks, sync errors, anomalies) | **Missing** | No central alert inbox. |

---

## 3. Reports and exports

| Requirement | Status | Notes |
|-------------|--------|--------|
| Transaction CSV export | **Built** | `AdminFinancials` — `exportTransactionsCsv` for selected period. |
| Scheduled / emailed reports | **Missing** | — |
| Revenue recognition / accounting export (GL) | **Missing** | — |
| User/credits ledger export | **Built** | `/admin/reports` → Credit ledger tab + CSV (backfilled from migration `credit_ledger`; history starts when migration is applied). |
| Racecard inventory / download report | **Built** | `/admin/reports` — downloads by racecard and by track. |
| Compliance / DSAR export package | **Missing** | — |

---

## 4. Analytics

| Requirement | Status | Notes |
|-------------|--------|--------|
| Signups over time | **Built** | `AdminAnalytics` — `profiles.created_at` by day. |
| Racecard downloads over time | **Built** | `racecard_downloads` by day. |
| Combined chart | **Built** | Signups vs downloads. |
| Date range selector | **Built** | 30 / 90 / 365 days. |
| Audit log viewer | **Built** | Latest rows from `audit_log`. |
| Funnels (visit → signup → purchase) | **Missing** | Needs product analytics instrumentation + storage. |
| Cohort / retention | **Missing** | — |
| Traffic / marketing attribution | **Partial** | Settings allow GA / Plausible keys; no admin dashboards for those tools inside the app. |
| Per-racecard or per-track popularity | **Built** | `/admin/reports` tabs (by racecard / by track). |
| AI usage / cost analytics (tokens, $) | **Missing** | OpenRouter key in settings; no usage metering UI. |

---

## 5. Financial

| Requirement | Status | Notes |
|-------------|--------|--------|
| Revenue KPIs for period | **Built** | Completed transactions: revenue, credits sold, count, AOV. |
| Revenue charts | **Built** | By day (area) and by package (bar). |
| Credits outstanding (liability) | **Built** | Sum of `credit_balances.credits` (units, not $). |
| Period filter + all-time | **Built** | `AdminFinancials`. |
| Stripe reconciliation | **Partial** | `stripe_session_id` on transactions; no automatic mismatch detection vs Stripe. |
| Refunds / chargebacks workflow | **Missing** | Not visible in admin; likely **N/A / external** via Stripe + manual DB. |
| Tax / invoice generation | **Missing** | — |
| Multi-currency | **Missing** | Assumes USD-style amounts in UI. |

---

## 6. Users and identity

| Requirement | Status | Notes |
|-------------|--------|--------|
| List users (profile) | **Built** | Admin dashboard customers tab. |
| Create user (email/password) | **Built** | Edge function `admin-create-user`. |
| Give credits (manual adjustment) | **Built** | RPC `admin_add_credits`. |
| Edit profile / reset password / disable user | **Built** | Customer row **View** → sheet: edit name, password recovery link (copied when returned), ban / unban (`admin-manage-user`). |
| Impersonation (support) | **Missing** | — |
| Email verification / invite flow | **Partial** | Depends on Supabase auth defaults; not surfaced in admin. |

---

## 7. Credits and commerce

| Requirement | Status | Notes |
|-------------|--------|--------|
| Configure credit packages | **Built** | `AdminCreditPackages` → `credit_packages` table. |
| Stripe linkage | **Built** | Creating or editing a package in **Admin → Credit Packages** calls `manage-credit-package`, which creates a Stripe Product + Price and stores `stripe_price_id`. No manual Stripe Dashboard copy/paste is required for packages created in the app. |
| Promo codes / discounts | **Missing** | — |
| Subscription vs one-time | **Missing** | Model appears credit-based one-time; no subscription admin. |
| Credit expiration rules | **Missing** | Product copy says credits don’t expire; no admin to change policy. |

---

## 8. Support, messages, and CRM

| Requirement | Status | Notes |
|-------------|--------|--------|
| In-app ticket / conversation queue | **Partial** | `contact_submissions` + `/admin/support` (status + notes); not a full threaded ticket system. |
| Contact form → admin inbox | **Built** | Contact form inserts `contact_submissions`; admins use `/admin/support`. |
| Link user to support history | **Missing** | — |
| SLA / assignment | **Missing** | — |
| Knowledge base CMS | **Partial** | Page editor for `pages`; FAQs on Contact are hardcoded in `Contact.tsx`, not CMS-driven. |

---

## 9. Race information and content

| Requirement | Status | Notes |
|-------------|--------|--------|
| Racecard library (metadata: track, date, file) | **Built** | `racecards` + upload/sync/delete on dashboard. |
| Public vs admin fields (`num_races`, etc.) | **Partial** | Schema supports `num_races`; upload flow may not always populate. |
| Download tracking | **Built** | `racecard_downloads` (used in analytics). |
| **Admin** report: downloads by racecard / user | **Partial** | By racecard/track in `/admin/reports`; per-user download list in customer **View** sheet. |
| Corrections / versioning (replace PDF, history) | **Missing** | Delete + re-upload only. |
| Calendar / fixtures integration | **Missing** | — |

---

## 10. AI and analysis

| Requirement | Status | Notes |
|-------------|--------|--------|
| Configure OpenRouter (API key, model) | **Built** | `AdminSettings` via `manage-app-settings` edge function. |
| Prompt / feature flags for AI surfaces | **Missing** | Keys only; no admin for prompts or per-feature toggles. |
| Run analysis on a racecard from admin | **Missing** | No “analyze this PDF” or batch job UI. |
| Store / review AI outputs | **Missing** | No `ai_runs` or similar table in typed schema. |
| Cost controls (caps, per-user limits) | **Missing** | — |
| Safety / moderation queue | **Missing** | — |

---

## 11. CMS and marketing site

| Requirement | Status | Notes |
|-------------|--------|--------|
| Visual page editor (GrapesJS) | **Built** | `PageEditor` — slug, title, **published**, `meta_description`; `?slug=` deep link. |
| List all pages / publish workflow | **Built** | `/admin/pages` + publish toggle + link to editor. Public reads only `published = true`. |
| SEO metadata per page | **Partial** | Meta description field only; no Open Graph / full SEO panel. |
| Redirects / A-B tests | **Missing** | — |

---

## 12. System settings and integrations

| Requirement | Status | Notes |
|-------------|--------|--------|
| Central app settings (secrets, Stripe, SMTP, captcha, analytics) | **Built** | `AdminSettings` + `manage-app-settings`. |
| Secrets hygiene (never expose full keys) | **Built** | Preview/truncation pattern in settings UI. |
| Health checks (DB, Edge Functions, S3) | **Missing** | — |
| Feature flags | **Missing** | — |

---

## 13. Security, compliance, and operations

| Requirement | Status | Notes |
|-------------|--------|--------|
| RLS / admin read access | **Built** | Assumed configured for admin role in Supabase (verify in migrations). |
| Audit log | **Built** | View in Analytics; retention policy **N/A** here. |
| PII export / delete workflows | **Missing** | — |
| Rate-limit / abuse dashboard | **Missing** | — |

---

## 14. Route map (implemented)

| Path | Purpose |
|------|---------|
| `/admin` | Home: KPIs, links, customers / transactions / racecards tabs. |
| `/admin/financials` | Revenue, charts, CSV export, credits outstanding. |
| `/admin/analytics` | Signups/downloads charts, audit log. |
| `/admin/settings` | Integrations and secrets management. |
| `/admin/credit-packages` | Pricing tiers. |
| `/admin/support` | Contact form inbox (`contact_submissions`). |
| `/admin/reports` | Downloads by racecard/track, credit ledger + CSV. |
| `/admin/pages` | CMS page list and publish toggle. |
| `/admin/page-editor` | Visual CMS (`pages`); supports `?slug=`. |

---

## 15. Suggested priority backlog (product)

Ordered for **operating the company** with the least friction:

1. **Support** — Persist contact submissions or integrate a helpdesk; admin queue linked to `user_id` / email.
2. **User admin** — Reset password, disable account, view transactions/downloads for one user.
3. **Reports** — Downloads-by-racecard/user, credits ledger (purchases + grants + deductions).
4. **Financial** — Stripe reconciliation view (sessions vs `transactions`).
5. **Race ops** — Replace PDF with version history; optional per-racecard analytics in admin.
6. **AI** — If customer-facing AI ships: usage metering, job history, cost caps, admin re-run.
7. **CMS** — Page list, draft/publish, SEO fields.

---

## 16. Maintenance

- Regenerate Supabase TypeScript types when migrations change (`src/integrations/supabase/types.ts` currently omits some tables such as `credit_packages`, `pages`, `app_settings` — keep types in sync for safer admin work).
- When adding an admin feature, add a row under the right section above and update **Route map** if you add a path.
