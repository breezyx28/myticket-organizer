import { disconnectEcho } from '@/lib/realtime/echo';
import { organizerApi } from '@/store/api/organizerApi';
import { setAccessToken } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store/store';

export const ORGANIZER_SESSION_STORAGE_KEY = 'myticket_organizer_session_v1';

export function clearStoredOrganizerSessionUser() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(ORGANIZER_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Clear bearer token, RTK organizer cache, realtime connection, and persisted session user. */
export function clearClientAuthSession(dispatch: AppDispatch) {
  disconnectEcho();
  dispatch(setAccessToken(null));
  dispatch(organizerApi.util.resetApiState());
  clearStoredOrganizerSessionUser();
}
