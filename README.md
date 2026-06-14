# DATAEEL Shop (Spark)

Frontend for **DATAEEL®** — horse racing predictions and storefront (Vite SPA). Backend pieces live in **Supabase** (database, auth, Edge Functions) with **AWS S3** for RaceCard PDF storage and **Stripe** for payments.

## Prerequisites

- **Node.js** and **npm** (use an active LTS release; the repo does not pin a version in `package.json`)

## Install & run

```sh
npm install
npm run dev
```

Development server: Vite (see terminal output for local URL).

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run build:dev` | Build with development mode |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest (single run) |
| `npm run test:watch` | Vitest watch mode |
| `npm run prepare:racecards` | Asset prep for S3 (`scripts/prepare-racecards-for-s3.mjs`) |
| `npm run backfill:race-results` | Trigger race-results ingestion (`scripts/backfill-race-results.mjs`) |

## Tech stack

- **Vite** · **React 18** · **TypeScript**
- **Tailwind CSS** · **shadcn/ui** (Radix primitives)
- **React Router** · **TanStack Query**
- **Supabase** (`@supabase/supabase-js`) — auth, data, Edge Function calls
- **Stripe** — credit-package checkout, customer portal, webhooks
- **GrapesJS** — visual CMS page editor
- **Vitest** + Testing Library for tests

## Environment variables

Copy **`.env.example`** → **`.env`** for local development. Variable names and notes are documented in `.env.example` (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, optional Stripe publishable key and analytics IDs). Do not commit `.env`.

Server-side secrets for Stripe webhooks and Edge Functions are configured in the Supabase project (see comments in `.env.example`).

---

## Application structure

```
src/
├── App.tsx              # Route table, providers, error boundary, scroll restore
├── pages/               # Route-level page components
├── components/          # Shared UI + feature components
│   ├── admin/           # Admin settings panels
│   ├── dashboard/       # User dashboard columns/sections
│   └── ui/              # shadcn/ui primitives (Radix-based)
├── contexts/            # AuthContext (user/session/admin state)
├── hooks/               # use-mobile, use-toast
├── lib/                 # Utilities, formatters, analytics, SEO, CMS sanitization
│   └── queries/         # TanStack Query data hooks
├── integrations/supabase/  # Supabase client + generated DB types
└── legal/               # Structured Terms / Privacy / Disclaimer content
supabase/functions/      # Deno Edge Functions (API + scheduled jobs)
scripts/                 # Node maintenance/import scripts
docs/                    # Deployment checklist, data-layer notes, requirements
```

---

## Pages & routes

Routes are defined in [`src/App.tsx`](src/App.tsx). Most public pages are wrapped by `EditablePage`, which renders a CMS-managed version from the database if one is published, falling back to the default component. `ProtectedRoute` redirects unauthenticated users to `/auth`; `requireAdmin` additionally blocks non-admins.

### Public pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Index` | Landing page: hero, breaking-news ticker, how-it-works, results, race cards, pricing, testimonials, FAQ, CTA. |
| `/pricing` | `Pricing` | Credit package pricing tiers with features and purchase CTA. |
| `/contact` | `Contact` | Contact form, support email, and topic FAQ accordion. |
| `/betting-basics` | `BettingBasics` | Educational guide to horse racing and betting fundamentals. |
| `/how-to-read-racecard` | `HowToReadRacecard` | Tutorial (images + video) on reading RaceCard columns and notations. |
| `/insights`, `/insights/:slug` | `Insights` | Articles index and individual insight articles. |
| `/racecards` | `RaceCardsBrowse` | Browse/search RaceCards by date with credit balance and download options. |
| `/auth` | `Auth` | Login, signup, and password-reset flow with email verification. |
| `/terms` | `Terms` | Terms & Conditions with table of contents. |
| `/privacy-policy` | `PrivacyPolicy` | Privacy policy with hash-anchored sections. |
| `/disclaimer` | `Disclaimer` | Legal disclaimer with hash-anchored sections. |
| `*` | `NotFound` | 404 page with link home. |

### Authenticated user pages (`ProtectedRoute`)

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | `Dashboard` | Credit balance, recent purchases, active/upcoming RaceCards, results feed, quick actions. |
| `/buy-credits` | `BuyCredits` | Credit purchase with package selection and Stripe checkout. |
| `/racecards/:racecardId` | `DigitalRaceCard` | Detailed RaceCard view: metadata, race rows, weather badge, download deadline countdown. |
| `/invoices` | `Invoices` | Invoice history with PDF links and Stripe portal access. |
| `/account-settings` | `AccountSettings` | Profile (email/name/password), MFA enrollment, credit balance. |
| `/feedback` | `Feedback` | Feedback form with optional offer-token credit redemption. |

### Admin pages (`ProtectedRoute requireAdmin`)

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin` | `AdminDashboard` | Admin home: quick stats and navigation to all admin sections. |
| `/admin/settings` | `AdminSettings` | Platform config: API keys, SMTP, broadcast email, breaking news, AI, racetrack profiles, webhooks. |
| `/admin/financials` | `AdminFinancials` | Revenue charts, transaction analysis, refunds, trends. *(lazy)* |
| `/admin/analytics` | `AdminAnalytics` | Site analytics: traffic sources, page views, clicks, device/browser stats. *(lazy)* |
| `/admin/credit-packages` | `AdminCreditPackages` | Create/edit/delete credit packages and Stripe pricing. |
| `/admin/support` | `AdminSupport` | Review contact submissions and support tickets. *(lazy)* |
| `/admin/reports` | `AdminReports` | Credit-ledger reports and per-user transaction history. *(lazy)* |
| `/admin/seo` | `AdminSeoTools` | SEO audit, keyword research, meta-description generation. *(lazy)* |
| `/admin/pages` | `AdminPages` | List/manage CMS pages (publish toggle, slug, title). *(lazy)* |
| `/admin/page-editor` | `PageEditor` | GrapesJS visual editor for CMS pages (HTML/CSS, preview, publish). *(lazy)* |
| `/admin/help` | `AdminHelp` | Admin help guide, workflows, and FAQs. *(lazy)* |

`EditablePage` (`src/pages/EditablePage.tsx`) is a wrapper, not a route — it fetches and renders CMS-managed page content, falling back to the default component.

---

## Components

### Feature & layout components (`src/components/`)

| Component | Description |
|-----------|-------------|
| `Header` | Nav header: mobile menu, auth state, credit balance, user dropdown. |
| `Footer` | Footer with product/company/legal links and supported racetracks. |
| `Hero` | Marketing hero with racing background, trust badges, CTA buttons. |
| `PageHero` | Reusable page header: optional back link, badge, title, actions. |
| `About` | Team bios highlighting combined racing/data experience. |
| `HowItWorks` | Four-step workflow: preview, browse, unlock, play RaceCard. |
| `Results` | Section showing RaceCard features and Equibase integration. |
| `RaceCards` | Available RaceCards by track/date with day tabs. |
| `Pricing` | Credit-package pricing display from the `credit_packages` query. |
| `Testimonials` | Customer testimonial cards with ratings. |
| `FAQ` | Accordion of product FAQs. |
| `CTA` | Bottom-of-page call-to-action section. |
| `AbrNewsSection` | US racing news cards from ABR / TDN RSS feeds. |
| `DataeelAiAssistant` | Floating AI racing-assistant chat widget (token-limited). |
| `NewVisitorRacecardOffer` | Modal offering a free RaceCard to new visitors (time/scroll triggers). |
| `ProtectedRoute` | Auth/admin route guard. |
| `NavLink` | `react-router` NavLink wrapper with active/pending class support. |
| `HomeSectionHashRedirect` | Redirects legacy hash section links to home equivalents. |
| `SiteAnalyticsTracker` | Tracks sessions, page views, scroll depth, clicks, time-on-page. |
| `StripeTestModeDevBanner` | Dev banner shown when Stripe is in test mode. |
| `TrackCardHeroImage` | Renders track-specific hero image by canonical code, with fallback. |
| `TrackWeatherBadge` | Temperature, condition, wind, and local track time. |

### Admin panels (`src/components/admin/`)

| Component | Description |
|-----------|-------------|
| `AdminAiSettingsPanel` | AI model selection and token/cost usage monitoring. |
| `AdminBreakingNewsPanel` | Manage breaking-news ticker items. |
| `AdminBroadcastEmailPanel` | Send bulk emails to all users. |
| `AdminDashboardTables` | Searchable tabbed tables for customers, racecards, transactions. |
| `AdminDeleteUserDialog` | Confirm permanent user deletion with cascade warning. |
| `AdminRacetrackProfilesPanel` | Create/edit racetrack profiles (name, URL, coordinates, timezone). |
| `AdminSmtpSettingsPanel` | Configure SMTP with provider presets and test send. |
| `AdminUserDetailSheet` | Side panel of a user's downloads and transactions. |

### Dashboard sections (`src/components/dashboard/`)

| Component | Description |
|-----------|-------------|
| `DashboardPurchasesAndCredits` | Recent purchases, balance, and low-credit warning. |
| `DashboardRacingResultsSection` | Equibase race-results feed by track selector. |
| `DashboardRecentDownloadsColumn` | Recently downloaded RaceCards with links. |
| `DashboardUpcomingRacecardsColumn` | Upcoming RaceCards grouped by track/date with purchase. |

`src/components/ui/` contains the standard **shadcn/ui** primitives (Radix-based) — buttons, dialogs, tables, forms, etc.

### Context & hooks

| Module | Description |
|--------|-------------|
| `contexts/AuthContext` | Provides user/session, admin-role flag, and `signOut`; syncs with Supabase auth changes. |
| `hooks/use-mobile` | Detects mobile viewport (< 768px) via media query. |
| `hooks/use-toast` | Toast notification state (reducer, auto-dismiss, actions). |

---

## Library functions (`src/lib/`)

### Data queries (`src/lib/queries/`) — TanStack Query hooks

| Hook | Description |
|------|-------------|
| `useTrackResultsFeed(trackCode, limit?)` | RSS race-results items for a track via edge function. |
| `useRacecardsPublicForDate(raceDate?)` | Public racecards for a given date. |
| `useInvoiceList(userId?)` | User invoices via the `list-invoices` edge function. |
| `useCreditBalance(userId?)` | Credit count and unlimited status snapshot. |
| `useTrackWeather(trackCode?, profile?)` | Open-Meteo weather + local track time. |
| `useRacetrackProfiles()` / `fetchRacetrackProfiles()` | All racetrack profiles (+ `profilesByTrackCode` index). |
| `useCreditPackages(options?)` | Credit packages with pricing and Stripe price IDs. |
| `useUserDashboard(userId?)` | Aggregated dashboard data (balance, downloads, upcoming, purchases). |

### Utilities & helpers (`src/lib/`)

| Module | Key exports | Purpose |
|--------|-------------|---------|
| `utils.ts` | `cn()` | clsx + tailwind-merge classname helper. |
| `errorHandler.ts` | `sanitizeError()` | Map raw errors to user-friendly copy. |
| `edgeFunctionErrors.ts` | `describeFunctionInvokeError()`, `getInvokeErrorMessage()` | Map Supabase function errors (404/401/CORS) to messages. |
| `queryKeys.ts` | `racecardPublicKeys`, `userDashboardKeys`, `invoiceListKeys` | TanStack Query cache key factories. |
| `creditDisplay.ts` | `formatCreditsBalance()`, `hasSufficientCredits()` | Credit UI formatting and eligibility. |
| `racecardDownloadDeadline.ts` | `getRacecardDownloadDeadlineUtcMillis()`, `isRacecardDownloadAvailableAt()` | Timezone-aware RaceCard download window logic. |
| `parseRacecardFilename.ts` | `parseRacecardFilename()`, `stripRacecardUuidPrefix()` | Parse track/date from RaceCard filenames. |
| `racetracks.ts` | `normalizeTrackCode()`, `getRacetrackLabel()`, `RACETRACK_BY_CODE` | Track-code normalization, labels, location lookup. |
| `resultsTracks.ts` | `canonicalizeResultsTrackCode()`, `getTargetResultsTrackOptions()` | Target tracks + aliases for results ingestion. |
| `raceMetadata.ts` | `parseRacecardMetadata()`, `buildRaceRows()` | Parse/format race condition, weather, post time, race list. |
| `trackHeroImage.ts` | `getTrackHeroImage()` | Resolve track hero image from bundled assets with fallback. |
| `decodeHtmlEntities.ts` | `decodeHtmlEntities()` | Decode named/numeric/decimal HTML entities. |
| `downloadSignedUrl.ts` | `downloadFromSignedUrl()`, `sanitizeDownloadFileName()` | Blob downloads from presigned URLs + safe filenames. |
| `parseRss2Xml.ts` | `parseRss2Items()`, `parseRss2ChannelTitle()` | Minimal RSS 2.0 parser. |
| `siteAnalytics.ts` | `trackSiteEvent()`, `summarizeSiteAnalytics()`, `classifyTrafficSource()` | Client analytics tracking and summarization. |
| `seoTools.ts` | `analyzePageSeo()`, `normalizeKeywords()`, `normalizeAuditUrl()` | SEO audit (keyword density, title/meta/heading checks). |
| `cmsHtml.ts` | `sanitizeCmsHtml()`, `sanitizeCmsCss()` | Sanitize CMS HTML/CSS (strip scripts, handlers, `javascript:`). |
| `pageEditorSeeds.ts` | `PageSeed`, seed template | Default GrapesJS page templates/theme. |
| `insights.ts` | `insightArticles[]`, `InsightArticle` | Curated insight article content. |
| `breakingNewsTicker.ts` | `buildTickerLoopItems()`, `tickerDurationSeconds()` | Breaking-news ticker loop helpers. |
| `adminDashboardTypes.ts` | `mergeProfilesWithCredits()`, admin types | Admin view types; merge profiles + credits. |
| `adminCreditLedger.ts` | `creditLedgerEntryTypeLabel()`, `formatLedgerDelta()` | Credit-ledger display + CSV export helpers. |
| `adminCharts.ts` | `toDateKey()`, `filterSince()`, `sumByDayAmount()` | Admin chart/report filters and aggregators. |
| `formatDashboardDate.ts` | `formatLocalDate()` | date-fns date formatting with fallback. |
| `postPaymentConfirmation.ts` | `waitForPurchaseTransaction()` | Poll credit balance after Stripe redirect. |
| `schedulePostPaymentCreditRefetch.ts` | `schedulePostPaymentCreditRefetch()` | Staggered query invalidation after payment. |
| `stripeViteDev.ts` | `getClientStripePublishableKey()`, `isClientStripeTestMode()` | Stripe publishable-key / test-mode detection. |
| `racingAssistantLimits.ts` | `RACING_ASSISTANT_MAX_MESSAGE_CHARS`, `RACING_ASSISTANT_MAX_HISTORY` | Client limits for the AI assistant. |
| `runtimeEnv.ts` | `logMissingPublicEnv()` | Warn on missing public env vars. |

### Integrations & legal content

- `integrations/supabase/client.ts` — pre-configured Supabase singleton (session storage + auto-refresh).
- `integrations/supabase/types.ts` — generated `Database` types for all tables/views/functions.
- `legal/terms`, `legal/privacy`, `legal/disclaimer` — structured, type-tagged legal content (paragraphs, headings, lists, tables) consumed by the legal pages.

Many `lib/` modules have colocated `*.test.ts` Vitest suites.

---

## Supabase Edge Functions (`supabase/functions/`)

Deno functions providing the API surface, scheduled jobs, and third-party integrations. `_shared/` holds reusable modules (CORS, AES-256-GCM encryption, AI cost estimation, racecard filename parsing, SMTP client, Stripe config, RAG utilities, S3 env setup, WP import schema).

### Payments & credits

| Function | Description |
|----------|-------------|
| `create-checkout-session` | Create a Stripe Checkout session for a credit package. |
| `stripe-webhook` | Stripe webhook handler — fulfills purchases and updates credits. |
| `reconcile-checkout-session` | Repair fulfillment when checkout succeeded but the webhook failed. |
| `customer-portal` | Open a Stripe Customer Portal session. |
| `list-invoices` | List the authenticated user's Stripe invoices. |
| `manage-credit-package` | Create/update/delete Stripe products and prices. |
| `purge-test-purchases` | Reverse test-mode purchases and credits (test only). |

### RaceCards & results

| Function | Description |
|----------|-------------|
| `download-racecard` | Presigned S3 URL for downloading a RaceCard PDF. |
| `generate-upload-url` | Presigned S3 URL for uploading a RaceCard PDF. |
| `sync-s3-racecards` | List S3 PDFs and register new racecards in the catalog. |
| `racecard-digitization-webhook` | Store OCR race predictions from AWS Textract. |
| `ingest-race-results` | Parse/normalize race results from RSS into the DB (with backfill). |
| `track-results-rss` | Generate a custom results RSS feed from the database. |
| `track-image-search` | Find racetrack photos on Wikimedia Commons for hero images. |

### RSS proxies (CORS bypass)

| Function | Source |
|----------|--------|
| `abr-rss` | America's Best Racing. |
| `tdn-rss` | Thoroughbred Daily News. |
| `hrn-headlines-rss` | Horse-Races.net (fallback). |
| `otb-results-rss` | OffTrackBetting.com results. |
| `equibase-late-changes-rss` | Equibase scratches / late changes. |

### Admin, AI & notifications

| Function | Description |
|----------|-------------|
| `admin-create-user` | Create an auth user (admin). |
| `admin-manage-user` | Ban/unban, recover password, update profile, set unlimited credits, delete. |
| `ai-admin` | Manage AI provider config and encrypted API keys. |
| `racing-assistant` | AI chat endpoint (RAG over cached knowledge) with cost estimation. |
| `manage-app-settings` | Encrypted CRUD for app settings (SMTP, API keys, Stripe secrets). |
| `send-broadcast-email` | Send encrypted bulk emails to user lists. |
| `notify-admin-contact-submission` | Email admins on contact-form submission. |
| `notify-admin-new-signup` | Email admins on new signup (DB webhook). |
| `daily-site-report` | Email a daily analytics report to support. |
| `import-wp-members` | Import WordPress members into Supabase Auth/profiles. |

---

## Scripts (`scripts/`)

| Script | Description |
|--------|-------------|
| `prepare-racecards-for-s3.mjs` | Rename Equibase-style PDFs to `TRACKCODE_YYYY-MM-DD.pdf` for S3 (`npm run prepare:racecards`). |
| `backfill-race-results.mjs` | Manually trigger the `ingest-race-results` function (`npm run backfill:race-results`). |
| `backfill-equibase-results.mjs` | Scrape historical Equibase results and emit SQL for insertion. |
| `import-wp-members-auth.mjs` | Bulk-import WordPress members into Supabase Auth/profiles (dry-run supported). |
| `aws-racecard-digitizer/` | AWS Textract pipeline: `start.mjs` (submit PDF), `parser.mjs` (extract predictions), `finish.mjs` (poll + post to webhook). |

---

## More docs

- `docs/deployment-checklist.md` — deployment steps.
- `docs/data-layer.md` — data layer notes.
- `docs/admin-dashboard-requirements.md` — admin requirements.
- `docs/build-checklist.md` — build checklist.
