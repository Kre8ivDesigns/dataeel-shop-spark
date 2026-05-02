# DATAEEL Shop (Spark)

Frontend for **DATAEEL®** — horse racing predictions and storefront (Vite SPA). Backend pieces live in **Supabase** (database, auth, Edge Functions).

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

## Tech stack

- **Vite** · **React 18** · **TypeScript**
- **Tailwind CSS** · **shadcn/ui** (Radix primitives)
- **React Router** · **TanStack Query**
- **Supabase** (`@supabase/supabase-js`) — auth, data, Edge Function calls
- **Vitest** + Testing Library for tests

## Environment variables

Copy **`.env.example`** → **`.env`** for local development. Variable names and notes are documented in `.env.example` (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, optional Stripe publishable key and analytics IDs). Do not commit `.env`.

Server-side secrets for Stripe webhooks and Edge Functions are configured in the Supabase project (see comments in `.env.example`).

## More docs

- `docs/` — deployment checklist, data layer notes, and other project docs.
