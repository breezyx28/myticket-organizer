/**
 * Legacy localStorage dashboard seed was removed in favor of the organizer API.
 * `resetState` remains so tests can clear any old `myticket_organizer_dashboard_v1` data.
 */
const KEY = 'myticket_organizer_dashboard_v1';

export function resetState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
