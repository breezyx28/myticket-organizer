import type { EventChangeNotification } from '@/types/domain';

const KEY = 'myticket_organizer_notifications_v1';

function read(): EventChangeNotification[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as EventChangeNotification[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function write(items: EventChangeNotification[]) {
  sessionStorage.setItem(KEY, JSON.stringify(items));
}

export function listEventNotifications(): EventChangeNotification[] {
  return read();
}

export function appendNotification(entry: EventChangeNotification) {
  const next = [entry, ...read()].slice(0, 100);
  write(next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('organizer-dashboard-changed'));
  }
}
