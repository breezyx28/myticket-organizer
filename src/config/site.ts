/** Main customer site origin for handoff links (password reset, etc.). No trailing slash. */
export function getMainSiteOrigin(): string | null {
  const v = import.meta.env.VITE_MAIN_SITE_URL;
  if (typeof v === 'string' && v.trim().length > 0) {
    return v.replace(/\/+$/, '');
  }
  return null;
}
