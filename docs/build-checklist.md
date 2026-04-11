# Build checklist — phased gates and testing

Each phase must pass its **exit criteria** before starting the next. Prefer adding or extending automated tests when a gate repeats or regresses often.

## Phase 0 — App shell and public routes

**Goal:** The SPA loads everywhere you develop (local, Codespaces, preview URLs), not only a blank or solid-colored screen.

**Manual**

- [ ] `npm install` then `npm run dev`; open the printed URL.
- [ ] **Public pages** render with real content (not only `body` background):
  - `/` — hero, ticker, CTAs
  - `/pricing`
  - `/contact`
  - `/auth`
- [ ] **404:** visit `/this-route-does-not-exist` → Not Found page, not a blank screen.
- [ ] If using **GitHub Codespaces** or another non-local host: confirm the dev server allows that host (see `vite.config.ts` `server.allowedHosts`). If you see Vite “host not allowed”, extend the list for your tunnel domain.

**Automated (target — add when stabilizing Phase 0)**

- [ ] Smoke test: build succeeds (`npm run build`) and preview serves (`npm run preview` optional).
- [ ] Optional: Playwright smoke — assert `h1` or landmark exists on `/`, `/pricing`, `/contact`.

**Exit criteria**

- `npm run build` passes.
- `npm test` passes.
- All public routes above visibly correct in the target environment.

---

## Phase 1 — Authentication and session

**Goal:** Sign-in, sign-out, and session refresh behave predictably; admin flag is not flaky.

**Manual**

- [ ] Sign up / sign in on `/auth` (happy path).
- [ ] Refresh the page while logged in — still logged in.
- [ ] Sign out — protected routes redirect to auth as designed.
- [ ] **Admin:** user with `is_admin` can open `/admin`; non-admin cannot.

**Automated (target)**

- [ ] Unit/integration tests for auth helpers and `AuthContext` (session + `is_admin` without arbitrary timeouts).
- [ ] Optional: E2E login with test Supabase project or mocked auth.

**Exit criteria**

- Phase 0 still passes.
- No console errors on auth flows in dev.

---

## Phase 2 — Credits, Stripe, and invoices

**Goal:** Purchase path and credit balance updates work end-to-end in a test/stripe-cli environment.

**Manual**

- [ ] `/buy-credits` loads for a logged-in user with sufficient setup.
- [ ] Test checkout (Stripe test mode) completes and credits or entitlement updates in UI.
- [ ] `/invoices` lists expected rows after a test purchase (if applicable).

**Automated (target)**

- [ ] Tests for price/package resolution and webhook handler logic (where testable without live Stripe).
- [ ] Optional: Stripe CLI–driven integration in CI.

**Exit criteria**

- Phase 1 still passes.
- Document required env vars for Stripe/Supabase in one place (e.g. README or deploy doc — only when you maintain that doc).

---

## Phase 3 — Racecards and protected downloads

**Goal:** Listings use safe public views; downloads use presigned URLs and CORS matches deployed origins.

**Manual**

- [ ] `/racecards` lists cards for a credited user.
- [ ] Download opens or saves the file; no raw secret URLs in network tab for listing payloads.
- [ ] From production-like origin, download succeeds (CORS + `ALLOWED_ORIGINS` on Edge Functions).

**Automated (target)**

- [ ] Tests for any client-side mapping from `racecards_public` (or equivalent) to UI rows.
- [ ] Optional: contract test for Edge Function responses (mocked).

**Exit criteria**

- Phase 2 still passes for a user who can access racecards.

---

## Phase 4 — Admin operations

**Goal:** Admin dashboards and settings do not break production data paths.

**Manual**

- [ ] `/admin` — credit grants and key actions work (e.g. credits use `user_id` where required).
- [ ] `/admin/settings` — save paths and readbacks correct.
- [ ] `/admin/financials` and `/admin/analytics` load (lazy charts without infinite spinners on empty data).
- [ ] `/admin/credit-packages`, `/admin/page-editor` as applicable.

**Automated (target)**

- [ ] Regression test for “give credits” payload shape vs RPC expectations.

**Exit criteria**

- Phases 0–3 still pass for normal users.

---

## Phase 5 — Release and hosting

**Goal:** Static SPA hosting rewrites all paths to `index.html`; env vars set per environment.

**Manual**

- [ ] Production build deployed; deep link to `/pricing` (refresh) works.
- [ ] Supabase auth redirect URLs include production domain.
- [ ] Edge Functions secrets (`ALLOWED_ORIGINS`, etc.) match production.

**Automated**

- [ ] CI runs `npm run lint`, `npm test`, `npm run build` on each PR.

**Exit criteria**

- Staging/production smoke matches Phase 0 public routes.

---

## Quick command reference

```bash
npm run dev
npm test
npm run build
npm run lint
```

When a phase fails, fix and re-run **from Phase 0** for the affected surface (especially after auth, Stripe, or CORS changes).
