/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** IANA zone; must match Edge `RACECARD_DOWNLOAD_TZ` for consistent download cutoff UX */
  readonly VITE_RACECARD_DOWNLOAD_TZ?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
