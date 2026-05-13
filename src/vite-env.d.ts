/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Main MyTicket website origin (password reset handoff), no trailing slash */
  readonly VITE_MAIN_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
