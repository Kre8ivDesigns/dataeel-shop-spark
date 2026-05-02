/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** IANA zone; must match Edge `RACECARD_DOWNLOAD_TZ` for consistent download cutoff UX */
  readonly VITE_RACECARD_DOWNLOAD_TZ?: string;
  /** Optional; when `pk_test_…`, shows a dev test-mode banner on Buy credits / Dashboard */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
