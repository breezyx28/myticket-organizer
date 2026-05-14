/// <reference types="vite/client" />

interface Window {
  /** Optional runtime API origin if not set at build (set before the app module loads). */
  __ORGANIZER_API_BASE_URL__?: string;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Main MyTicket website origin (password reset handoff), no trailing slash */
  readonly VITE_MAIN_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
