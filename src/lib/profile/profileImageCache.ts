const CACHE_PREFIX = 'myticket-organizer-profile-image-url:';

export function cacheProfileImageUrl(userId: string, url: string) {
  if (typeof sessionStorage === 'undefined') return;
  const id = userId.trim();
  const u = url.trim();
  if (!id || !u) return;
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${id}`, u);
  } catch {
    /* ignore */
  }
}

export function readCachedProfileImageUrl(userId: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const id = userId.trim();
  if (!id) return null;
  try {
    return sessionStorage.getItem(`${CACHE_PREFIX}${id}`);
  } catch {
    return null;
  }
}

export function clearCachedProfileImageUrl(userId: string) {
  if (typeof sessionStorage === 'undefined') return;
  const id = userId.trim();
  if (!id) return;
  try {
    sessionStorage.removeItem(`${CACHE_PREFIX}${id}`);
  } catch {
    /* ignore */
  }
}
