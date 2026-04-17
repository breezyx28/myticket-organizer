import { SEED_STATE } from '@/data/mockOrganizerData';
import type { OrganizerDashboardState } from '@/types/domain';

const KEY = 'myticket_organizer_dashboard_v1';

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function loadState(): OrganizerDashboardState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return clone(SEED_STATE);
    const parsed = JSON.parse(raw) as OrganizerDashboardState;
    if (!parsed?.events || !parsed?.profile) return clone(SEED_STATE);
    return parsed;
  } catch {
    return clone(SEED_STATE);
  }
}

export function saveState(next: OrganizerDashboardState) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function resetState() {
  localStorage.removeItem(KEY);
}

export function updateState(mutator: (draft: OrganizerDashboardState) => void): OrganizerDashboardState {
  const draft = clone(loadState());
  mutator(draft);
  saveState(draft);
  return draft;
}
