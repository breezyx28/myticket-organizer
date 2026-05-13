/** Fallback when `VITE_API_BASE_URL` is unset (local backend). Set `VITE_API_BASE_URL` in `.env` for staging/production. */
const DEFAULT_BASE = 'http://localhost:8000';

/** Organizer API origin from Vite (`import.meta.env.VITE_API_BASE_URL`). */
export function getApiBaseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL;
  if (typeof v === 'string' && v.trim().length > 0) {
    return v.replace(/\/+$/, '');
  }
  return DEFAULT_BASE;
}

export const ORGANIZER_API_PREFIX = '/api/v1/organizer';

/** Public reference (throttled); no auth. */
export const REFERENCE_API_PREFIX = '/api/v1/reference';

/** Public main-app routes (e.g. event categories); no auth unless route specifies. */
export const MAIN_API_PREFIX = '/api/v1/main';
