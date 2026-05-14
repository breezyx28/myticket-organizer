/** Organizer backend origin (scheme + host + port if needed). No trailing slash. */
export const ApiBaseUrl = 'https://myticket-api.kat-jr.com';

export const ORGANIZER_API_PREFIX = '/api/v1/organizer';

/** Public reference (throttled); no auth. */
export const REFERENCE_API_PREFIX = '/api/v1/reference';

/** Public main-app routes (e.g. event categories); no auth unless route specifies. */
export const MAIN_API_PREFIX = '/api/v1/main';
