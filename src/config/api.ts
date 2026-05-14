/** Organizer API origin from Vite (`import.meta.env.VITE_API_BASE_URL`). Set in `.env` (no hardcoded default). */
export function getApiBaseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL;
  if (typeof v === 'string' && v.trim().length > 0) {
    return v.replace(/\/+$/, '');
  }
  throw new Error(
    'Missing VITE_API_BASE_URL. Define it in `.env` at the project root (e.g. VITE_API_BASE_URL=https://api.example.com), then restart `vite` / the dev server so the value is inlined.'
  );
}

export const ORGANIZER_API_PREFIX = '/api/v1/organizer';

/** Public reference (throttled); no auth. */
export const REFERENCE_API_PREFIX = '/api/v1/reference';

/** Public main-app routes (e.g. event categories); no auth unless route specifies. */
export const MAIN_API_PREFIX = '/api/v1/main';
