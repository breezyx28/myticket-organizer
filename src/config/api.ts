const META_NAME = 'organizer-api-base';

function normalizeApiBase(v: string): string {
  return v.trim().replace(/\/+$/, '');
}

function fromImportMeta(): string | undefined {
  const v = import.meta.env.VITE_API_BASE_URL;
  if (typeof v === 'string' && v.trim().length > 0) return normalizeApiBase(v);
  return undefined;
}

function fromWindow(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window.__ORGANIZER_API_BASE_URL__;
  if (typeof w === 'string' && w.trim().length > 0) return normalizeApiBase(w);
  return undefined;
}

function fromMeta(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const raw = document.querySelector(`meta[name="${META_NAME}"]`)?.getAttribute('content')?.trim();
  if (!raw || raw === '%VITE_API_BASE_URL%') return undefined;
  return normalizeApiBase(raw);
}

/**
 * Organizer API origin. Resolved in order:
 * 1. `import.meta.env.VITE_API_BASE_URL` (set when running `vite` / `vite build`, e.g. from `.env` or CI env)
 * 2. `window.__ORGANIZER_API_BASE_URL__` if set before the app bundle loads
 * 3. `<meta name="organizer-api-base" content="...">` in `index.html` (e.g. `%VITE_API_BASE_URL%` replaced at build, or injected when serving)
 */
export function getApiBaseUrl(): string {
  const resolved = fromImportMeta() ?? fromWindow() ?? fromMeta();
  if (resolved) return resolved;
  throw new Error(
    'Missing API base URL. Set `VITE_API_BASE_URL` for the build (e.g. export it in CI before `vite build`, or in `.env`), ' +
      'or inject at runtime: `<meta name="organizer-api-base" content="https://api.example.com" />` in index.html, ' +
      'or assign `window.__ORGANIZER_API_BASE_URL__` before the app script runs.'
  );
}

export const ORGANIZER_API_PREFIX = '/api/v1/organizer';

/** Public reference (throttled); no auth. */
export const REFERENCE_API_PREFIX = '/api/v1/reference';

/** Public main-app routes (e.g. event categories); no auth unless route specifies. */
export const MAIN_API_PREFIX = '/api/v1/main';
