import type { OrganizerEvent, EventStatus, LayoutType, EntryMode, TicketTypeDef, SeatCell } from '@/types/domain';
import { loadState, updateState } from '@/services/organizerStore';

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export async function listEvents(): Promise<OrganizerEvent[]> {
  await delay();
  return loadState().events;
}

export async function getEvent(id: string): Promise<OrganizerEvent | null> {
  await delay();
  return loadState().events.find((e) => e.id === id) ?? null;
}

export function upsertEvent(event: OrganizerEvent) {
  updateState((s) => {
    const i = s.events.findIndex((e) => e.id === event.id);
    if (i === -1) s.events.push(event);
    else s.events[i] = event;
  });
}

export function deleteEvent(id: string) {
  updateState((s) => {
    s.events = s.events.filter((e) => e.id !== id);
  });
}

export function duplicateEvent(sourceId: string): OrganizerEvent | null {
  const src = loadState().events.find((e) => e.id === sourceId);
  if (!src) return null;
  const copy: OrganizerEvent = {
    ...JSON.parse(JSON.stringify(src)) as OrganizerEvent,
    id: `evt-${Date.now()}`,
    title: `${src.title} (copy)`,
    status: 'draft',
    ticketsSold: 0,
    revenueGross: 0,
    lastChangeLog: [],
    postEventMedia: [],
    occurrences: src.occurrences.map((o) => ({
      ...o,
      id: `occ-${Date.now()}-${o.id}`,
      ticketsSold: 0,
      status: 'scheduled' as const,
    })),
  };
  upsertEvent(copy);
  return copy;
}

export function publishEvent(id: string) {
  updateState((s) => {
    const e = s.events.find((x) => x.id === id);
    if (!e) return;
    e.status = 'published';
  });
}

export function setEventStatus(id: string, status: EventStatus) {
  updateState((s) => {
    const e = s.events.find((x) => x.id === id);
    if (!e) return;
    e.status = status;
  });
}

export function markSoldOut(id: string) {
  setEventStatus(id, 'sold_out');
}

export function cancelEvent(id: string) {
  updateState((s) => {
    const e = s.events.find((x) => x.id === id);
    if (!e) return;
    e.status = 'cancelled';
    e.occurrences.forEach((o) => {
      o.status = 'cancelled';
    });
    s.notifications = [
      ...(s.notifications ?? []),
      {
        id: `ntf_${Date.now()}`,
        eventId: e.id,
        eventTitle: e.title,
        createdAt: new Date().toISOString(),
        kind: 'cancelled',
      },
    ];
  });
}

export function archiveEvent(id: string) {
  updateState((s) => {
    const e = s.events.find((x) => x.id === id);
    if (!e) return;
    e.status = 'archived';
  });
}

export function appendChangeLog(eventId: string, entries: { field: string; old: string; new: string }[]) {
  updateState((s) => {
    const e = s.events.find((x) => x.id === eventId);
    if (!e) return;
    const at = new Date().toISOString();
    e.lastChangeLog = [...(e.lastChangeLog ?? []), ...entries.map((en) => ({ ...en, at }))];
    s.notifications = [
      ...(s.notifications ?? []),
      {
        id: `ntf_${Date.now()}`,
        eventId: e.id,
        eventTitle: e.title,
        createdAt: at,
        kind: 'edited',
        changes: entries,
      },
    ];
  });
}

export function createDraftEvent(partial?: Partial<OrganizerEvent>): OrganizerEvent {
  const id = `evt-${Date.now()}`;
  const defaults: OrganizerEvent = {
    id,
    title: 'Untitled event',
    description: '',
    category: 'Music',
    venue: '',
    city: 'Riyadh',
    startsAt: new Date(Date.now() + 86400_000 * 7).toISOString(),
    endsAt: new Date(Date.now() + 86400_000 * 7 + 3 * 3600_000).toISOString(),
    status: 'draft',
    layoutType: 'grid',
    rows: 6,
    cols: 10,
    rowGap: 8,
    colGap: 8,
    capacity: 60,
    ticketTypes: [
      { id: 'tt_std', label: 'Standard', defaultPrice: 100 },
      { id: 'tt_vip', label: 'VIP', defaultPrice: 250 },
      { id: 'tt_acc', label: 'Accessibility', defaultPrice: 100 },
    ],
    seats: [],
    entryMode: 'one_time',
    multiDaySingleTicket: true,
    recurrence: null,
    occurrences: [],
    ticketsSold: 0,
    revenueGross: 0,
    waitlistCount: 0,
    postEventMedia: [],
  };
  const ev = { ...defaults, ...partial, id };
  if (ev.layoutType !== 'free' && ev.seats.length === 0) {
    ev.seats = buildSeatsFromGrid(ev);
  }
  upsertEvent(ev);
  return ev;
}

export function buildSeatsFromGrid(ev: Pick<OrganizerEvent, 'rows' | 'cols' | 'ticketTypes'>): SeatCell[] {
  const seats: SeatCell[] = [];
  const defaultType = ev.ticketTypes[0]?.id ?? 'tt_std';
  const defaultPrice = ev.ticketTypes[0]?.defaultPrice ?? 100;
  for (let r = 0; r < ev.rows; r++) {
    for (let c = 0; c < ev.cols; c++) {
      seats.push({
        id: `s-${r}-${c}-${Math.random().toString(36).slice(2, 7)}`,
        row: r,
        col: c,
        ticketTypeId: defaultType,
        price: defaultPrice,
        accessibility: false,
      });
    }
  }
  return seats;
}

export function patchEvent(
  id: string,
  patch: Partial<
    Pick<
      OrganizerEvent,
      | 'title'
      | 'description'
      | 'category'
      | 'venue'
      | 'city'
      | 'startsAt'
      | 'endsAt'
      | 'layoutType'
      | 'rows'
      | 'cols'
      | 'rowGap'
      | 'colGap'
      | 'rowGaps'
      | 'colGaps'
      | 'capacity'
      | 'ticketTypes'
      | 'seats'
      | 'entryMode'
      | 'purchaseLimitPerUser'
      | 'multiDaySingleTicket'
      | 'recurrence'
      | 'occurrences'
      | 'postEventMedia'
    >
  > & { layoutType?: LayoutType; status?: EventStatus; entryMode?: EntryMode; ticketTypes?: TicketTypeDef[] }
) {
  updateState((s) => {
    const e = s.events.find((x) => x.id === id);
    if (!e) return;
    const explicitSeats = patch.seats;
    Object.assign(e, patch);
    if (patch.layoutType === 'free') {
      e.seats = [];
    } else if (!explicitSeats && (patch.rows != null || patch.cols != null || patch.layoutType != null)) {
      e.seats = buildSeatsFromGrid(e);
    }
  });
}

export function cancelOccurrence(eventId: string, occurrenceId: string) {
  updateState((s) => {
    const e = s.events.find((x) => x.id === eventId);
    if (!e) return;
    const occ = e.occurrences.find((o) => o.id === occurrenceId);
    if (!occ) return;
    occ.status = 'cancelled';
  });
}

export function simulateLifecycleTick(id: string) {
  updateState((s) => {
    const e = s.events.find((x) => x.id === id);
    if (!e) return;
    if (e.status === 'draft') e.status = 'published';
    else if (e.status === 'published') e.status = 'in_progress';
    else if (e.status === 'in_progress') e.status = 'ended';
    else if (e.status === 'ended') e.status = 'archived';
  });
}

export function validateFreeLayoutTotals(event: OrganizerEvent) {
  if (event.layoutType !== 'free') {
    return { ok: true as const, total: 0, capacity: event.capacity };
  }
  const total = event.ticketTypes.reduce((sum, t) => sum + (t.quantityLimit ?? 0), 0);
  return { ok: total <= event.capacity, total, capacity: event.capacity } as const;
}

export function listEventNotifications() {
  return loadState().notifications ?? [];
}
