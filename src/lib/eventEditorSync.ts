import { reconcilePatchedEvent } from '@/lib/eventLayoutReconcile';
import type { OrganizerEvent } from '@/types/domain';

/** Fields the editor may PATCH or bind to inputs (excludes gallery list when refreshed separately). */
export const EVENT_EDITOR_DRAFT_KEYS: (keyof OrganizerEvent)[] = [
  'title',
  'description',
  'category',
  'categoryId',
  'venue',
  'city',
  'latitude',
  'longitude',
  'regionId',
  'cityId',
  'startsAt',
  'endsAt',
  'layoutType',
  'rows',
  'cols',
  'rowGap',
  'colGap',
  'rowGaps',
  'colGaps',
  'capacity',
  'entryMode',
  'purchaseLimitPerUser',
  'multiDaySingleTicket',
  'recurrence',
  'occurrences',
  'seats',
  'ticketTypes',
  'postEventMedia',
];

/** Always prefer server on merge (metrics / lifecycle). */
const SERVER_AUTHORITY_KEYS: (keyof OrganizerEvent)[] = [
  'status',
  'ticketsSold',
  'revenueGross',
  'waitlistCount',
  'eventGallery',
];

export function cloneEvent(ev: OrganizerEvent): OrganizerEvent {
  return JSON.parse(JSON.stringify(ev)) as OrganizerEvent;
}

export function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * After a save completes: start from server, then keep draft values the user changed
 * since the save began (baseline snapshot).
 */
export function mergeAfterSave(
  draft: OrganizerEvent,
  server: OrganizerEvent | null,
  baseline: OrganizerEvent,
  patch: Partial<OrganizerEvent>
): OrganizerEvent {
  if (!server) return draft;

  const next: OrganizerEvent = { ...server };
  for (const key of EVENT_EDITOR_DRAFT_KEYS) {
    if (!jsonEqual(draft[key], baseline[key])) {
      (next as Record<string, unknown>)[key as string] = draft[key];
    }
  }
  for (const key of SERVER_AUTHORITY_KEYS) {
    (next as Record<string, unknown>)[key as string] = server[key];
  }

  const reconciled = reconcilePatchedEvent(next, patch, baseline);
  return reconciled ?? next;
}

/** Restore session draft on top of fresh server load. */
export function mergePersistedDraftWithServer(persisted: OrganizerEvent, server: OrganizerEvent): OrganizerEvent {
  const baseline = server;
  const patch: Partial<OrganizerEvent> = {};
  for (const key of EVENT_EDITOR_DRAFT_KEYS) {
    if (!jsonEqual(persisted[key], server[key])) {
      (patch as Record<string, unknown>)[key as string] = persisted[key];
    }
  }
  return mergeAfterSave(persisted, server, baseline, patch);
}

/** Advance committed snapshot for fields included in a successful save. */
export function updateCommittedAfterSave(
  committed: OrganizerEvent,
  server: OrganizerEvent,
  patch: Partial<OrganizerEvent>
): OrganizerEvent {
  const next = cloneEvent(committed);
  const patchKeys = Object.keys(patch) as (keyof OrganizerEvent)[];
  for (const key of patchKeys) {
    (next as Record<string, unknown>)[key as string] = server[key];
  }
  for (const key of SERVER_AUTHORITY_KEYS) {
    (next as Record<string, unknown>)[key as string] = server[key];
  }
  return next;
}

const DRAFT_STORAGE_PREFIX = 'organizer_event_draft_v1_';
const REVISION_STORAGE_PREFIX = 'organizer_event_rev_v1_';
const TAB_STORAGE_PREFIX = 'organizer_event_tab_v1_';

export type PersistedEventDraft = {
  draft: OrganizerEvent;
  savedAt: number;
};

export type TabLease = {
  tabId: string;
  updatedAt: number;
};

export function draftStorageKey(eventId: string) {
  return `${DRAFT_STORAGE_PREFIX}${eventId}`;
}

export function revisionStorageKey(eventId: string) {
  return `${REVISION_STORAGE_PREFIX}${eventId}`;
}

export function tabStorageKey(eventId: string) {
  return `${TAB_STORAGE_PREFIX}${eventId}`;
}

export function loadPersistedDraft(eventId: string): PersistedEventDraft | null {
  try {
    const raw = sessionStorage.getItem(draftStorageKey(eventId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedEventDraft;
    if (!parsed?.draft?.id || String(parsed.draft.id) !== String(eventId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistDraft(eventId: string, draft: OrganizerEvent) {
  try {
    const payload: PersistedEventDraft = { draft, savedAt: Date.now() };
    sessionStorage.setItem(draftStorageKey(eventId), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearPersistedDraft(eventId: string) {
  try {
    sessionStorage.removeItem(draftStorageKey(eventId));
  } catch {
    /* ignore */
  }
}

export function bumpRemoteRevision(eventId: string) {
  try {
    localStorage.setItem(revisionStorageKey(eventId), String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function readRemoteRevision(eventId: string): number {
  try {
    const v = localStorage.getItem(revisionStorageKey(eventId));
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

export function writeTabLease(eventId: string, tabId: string) {
  try {
    const lease: TabLease = { tabId, updatedAt: Date.now() };
    localStorage.setItem(tabStorageKey(eventId), JSON.stringify(lease));
  } catch {
    /* ignore */
  }
}

export function readTabLease(eventId: string): TabLease | null {
  try {
    const raw = localStorage.getItem(tabStorageKey(eventId));
    if (!raw) return null;
    return JSON.parse(raw) as TabLease;
  } catch {
    return null;
  }
}

/** Merge only `ticketTypes` from server; preserve in-progress ticket type field edits. */
export function mergeTicketTypesFromServer(
  draft: OrganizerEvent,
  server: OrganizerEvent,
  baseline: OrganizerEvent
): OrganizerEvent {
  return {
    ...draft,
    ticketTypes: jsonEqual(draft.ticketTypes, baseline.ticketTypes) ? server.ticketTypes : draft.ticketTypes,
    ticketsSold: server.ticketsSold,
    revenueGross: server.revenueGross,
    waitlistCount: server.waitlistCount,
  };
}
