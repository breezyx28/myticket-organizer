import type { OrganizerEvent, EventStatus, LayoutType, EntryMode, SeatCell } from '@/types/domain';
import { organizerApi, type ListEventsPage } from '@/store/api/organizerApi';
import { asObjectArray } from '@/lib/api/json';
import {
  buildOrganizerEventPatchBody,
  resolveNumericTicketTypeId,
  tryBuildHomogeneousSeatUpdates,
  type SeatingPatchOptions,
} from '@/lib/api/eventSeatingPatch';
import { mapApiSeats, organizerEventPatchToApiBody } from '@/lib/api/mapEvent';
import { appendNotification, listEventNotifications as listStoredNotifications } from '@/services/localDashboardExtras';
import { apiDispatch, apiUnwrap } from '@/services/apiDispatch';
import { ApiBaseUrl, ORGANIZER_API_PREFIX } from '@/config/api';
import { ACCESS_TOKEN_STORAGE_KEY } from '@/store/slices/authSlice';

export { diffOrganizerEventPatch } from '@/lib/api/mapEvent';
export { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';

export function isServerNumericTicketTypeId(id: string): boolean {
  return /^\d+$/.test(id.trim());
}

const GALLERY_IMAGE_MAX_BYTES = 6 * 1024 * 1024;
const COVER_IMAGE_MAX_BYTES = 6144 * 1024;
const ACCEPTED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export type { ListEventsPage };

export async function listEventsPaged(page = 1): Promise<ListEventsPage> {
  return apiUnwrap<ListEventsPage>(apiDispatch(organizerApi.endpoints.listEvents.initiate({ page })));
}

export async function listEvents(): Promise<OrganizerEvent[]> {
  const page = await listEventsPaged(1);
  return page.data;
}

export async function getEvent(id: string): Promise<OrganizerEvent | null> {
  try {
    const ev = await apiUnwrap<OrganizerEvent>(apiDispatch(organizerApi.endpoints.getEvent.initiate(id)));
    if (!ev) return null;
    if (ev.layoutType !== 'free' && ev.seats.length === 0) {
      try {
        const raw = await apiUnwrap<unknown>(apiDispatch(organizerApi.endpoints.listSeats.initiate(id)));
        ev.seats = mapApiSeats(asObjectArray(raw), id);
      } catch {
        /* keep seats from event payload if any */
      }
    }
    return ev;
  } catch {
    return null;
  }
}

function seatCellChanged(before: SeatCell, after: SeatCell): boolean {
  return (
    before.ticketTypeId !== after.ticketTypeId ||
    before.price !== after.price ||
    before.accessibility !== after.accessibility ||
    (before.section ?? '') !== (after.section ?? '')
  );
}

function shouldBulkReplaceSeatMap(
  patch: Partial<OrganizerEvent>,
  merged: OrganizerEvent
): boolean {
  if (merged.layoutType === 'free') return false;
  if (patch.layoutType !== undefined || patch.rows !== undefined || patch.cols !== undefined) return true;
  if (!patch.seats?.length) return false;
  const expected = merged.rows * merged.cols;
  if (expected > 0 && patch.seats.length !== expected) return true;
  const serverIds = patch.seats.filter((s) => /^\d+$/.test(s.id.trim())).length;
  return serverIds < patch.seats.length * 0.5;
}

/** Regenerate seat map via unified event PATCH (`seating.regenerate`). */
export async function bulkReplaceEventSeats(
  eventId: string,
  opts: {
    layoutType: LayoutType;
    rows: number;
    cols: number;
    ticketTypeId?: number;
    section?: string;
  }
): Promise<OrganizerEvent | null> {
  const body = buildOrganizerEventPatchBody(
    {
      layoutType: opts.layoutType,
      rows: opts.rows,
      cols: opts.cols,
    },
    {
      regenerate: {
        layoutType: opts.layoutType,
        rows: opts.rows,
        cols: opts.cols,
        replace: true,
        ticketTypeId: opts.ticketTypeId,
        section: opts.section,
      },
    }
  );
  return patchEventApi(eventId, body);
}

async function patchEventApi(
  eventId: string,
  body: Record<string, unknown>
): Promise<OrganizerEvent | null> {
  if (Object.keys(body).length === 0) return null;
  return apiUnwrap<OrganizerEvent>(
    apiDispatch(organizerApi.endpoints.patchEvent.initiate({ id: eventId, body }))
  );
}

function mergeSeatsAfterSave(
  server: OrganizerEvent,
  merged: OrganizerEvent,
  patch: Partial<OrganizerEvent>
): OrganizerEvent {
  if (server.seats.length > 0) return server;
  if (patch.seats?.length && merged.seats.length > 0) {
    return { ...server, seats: merged.seats, rows: merged.rows, cols: merged.cols };
  }
  return server;
}

async function syncSeatsIndividually(
  eventId: string,
  nextSeats: SeatCell[],
  prevSeats: SeatCell[],
  ticketTypes: OrganizerEvent['ticketTypes']
): Promise<void> {
  const prevById = new Map(prevSeats.map((s) => [s.id, s]));
  for (const seat of nextSeats) {
    if (!/^\d+$/.test(seat.id.trim())) continue;
    const prev = prevById.get(seat.id);
    if (!prev || !seatCellChanged(prev, seat)) continue;
    const body: Record<string, unknown> = {};
    const ttId = resolveNumericTicketTypeId(ticketTypes, seat.ticketTypeId);
    if (ttId != null) body.ticket_type_id = ttId;
    if (seat.price !== prev.price) body.price = seat.price;
    if (seat.accessibility !== prev.accessibility) body.accessibility = seat.accessibility;
    if ((seat.section ?? '') !== (prev.section ?? '')) body.section = seat.section ?? null;
    if (Object.keys(body).length === 0) continue;
    await apiUnwrap(
      apiDispatch(
        organizerApi.endpoints.patchSeat.initiate({
          eventId,
          seatId: seat.id,
          body,
        })
      )
    );
  }
}

export async function upsertEvent(event: OrganizerEvent) {
  const existing = await getEvent(event.id);
  if (existing) {
    await apiUnwrap(
      apiDispatch(
        organizerApi.endpoints.patchEvent.initiate({
          id: event.id,
          body: organizerEventPatchToApiBody(event),
        })
      )
    );
  } else {
    await apiUnwrap(apiDispatch(organizerApi.endpoints.createEvent.initiate(organizerEventPatchToApiBody(event))));
  }
}

export async function deleteEvent(id: string) {
  await apiUnwrap(apiDispatch(organizerApi.endpoints.deleteEvent.initiate(id)));
}

export function canRemoveEventStatus(status: EventStatus): boolean {
  return status === 'draft' || status === 'rejected';
}

export function canArchiveEventStatus(status: EventStatus): boolean {
  return status === 'ended';
}

export async function removeEvent(id: string): Promise<void> {
  const ev = await getEvent(id);
  if (ev && !canRemoveEventStatus(ev.status)) {
    throw new Error('Delete is allowed only for draft or rejected events.');
  }
  await deleteEvent(id);
}

export async function duplicateEvent(sourceId: string): Promise<OrganizerEvent | null> {
  const src = await getEvent(sourceId);
  if (!src) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit from create payload
  const { ticketsSold, revenueGross, status: _status, ...restForApi } = src;
  const body = {
    ...organizerEventPatchToApiBody({
      ...restForApi,
      title: `${src.title} (copy)`,
      postEventMedia: [],
      occurrences: src.occurrences.map((o) => ({
        ...o,
        id: `occ-${Date.now()}-${o.id}`,
        ticketsSold: 0,
        status: 'scheduled' as const,
      })),
    }),
    title: `${src.title} (copy)`,
    status: 'draft',
  };
  try {
    return await apiUnwrap<OrganizerEvent>(apiDispatch(organizerApi.endpoints.createEvent.initiate(body)));
  } catch {
    return null;
  }
}

/** `POST …/events/{id}/submit` — sets status to `pending_approval` (not `published` until admin approves). */
export async function publishEvent(id: string) {
  await apiUnwrap(apiDispatch(organizerApi.endpoints.submitEvent.initiate(id)));
}

export const submitEventForReview = publishEvent;

/**
 * Organizer lifecycle uses dedicated routes only — never `PATCH { status }` (not accepted).
 * Supported: `cancelled` → cancel route, `archived` → archive route, `pending_approval` → submit (draft/rejected resubmit).
 */
export async function setEventStatus(id: string, status: EventStatus): Promise<void> {
  const current = await getEvent(id);
  if (!current) return;

  if (status === 'cancelled') {
    await cancelEvent(id);
    return;
  }
  if (status === 'archived') {
    await archiveEvent(id);
    return;
  }
  if (status === 'pending_approval') {
    if (current.status === 'draft' || current.status === 'rejected') {
      await apiUnwrap(apiDispatch(organizerApi.endpoints.submitEvent.initiate(id)));
      return;
    }
  }

  throw new Error(
    `Status “${status}” cannot be changed from the organizer app (no PATCH status). Use admin tools for publishing / sold-out / in-progress, or add organizer endpoints.`
  );
}

export async function cancelEvent(id: string) {
  const ev = await getEvent(id);
  await apiUnwrap(apiDispatch(organizerApi.endpoints.cancelEvent.initiate(id)));
  if (ev) {
    appendNotification({
      id: `ntf_${Date.now()}`,
      eventId: ev.id,
      eventTitle: ev.title,
      createdAt: new Date().toISOString(),
      kind: 'cancelled',
    });
  }
}

export async function archiveEvent(id: string) {
  const ev = await getEvent(id);
  if (ev && !canArchiveEventStatus(ev.status)) {
    throw new Error('Archive is allowed only after the event has ended.');
  }
  await apiUnwrap(apiDispatch(organizerApi.endpoints.archiveEvent.initiate(id)));
}

export async function appendChangeLog(eventId: string, entries: { field: string; old: string; new: string }[]) {
  const ev = await getEvent(eventId);
  if (!ev) return;
  const at = new Date().toISOString();
  appendNotification({
    id: `ntf_${Date.now()}`,
    eventId: ev.id,
    eventTitle: ev.title,
    createdAt: at,
    kind: 'edited',
    changes: entries.map((en) => ({ ...en, at })),
  });
}

/** Default schedule for a brand-new event (API requires `starts_at` / `ends_at` on POST). */
export function defaultNewEventSchedule(): { startsAt: string; endsAt: string } {
  const startsAt = new Date(Date.now() + 86400_000 * 7).toISOString();
  const endsAt = new Date(Date.now() + 86400_000 * 7 + 3 * 3600_000).toISOString();
  return { startsAt, endsAt };
}

export async function createDraftEvent(partial?: Partial<OrganizerEvent>): Promise<OrganizerEvent> {
  const { startsAt: defaultStart, endsAt: defaultEnd } = defaultNewEventSchedule();
  const startsAt = partial?.startsAt ?? defaultStart;
  const endsAt = partial?.endsAt ?? defaultEnd;

  const createBody = organizerEventPatchToApiBody({
    title: partial?.title ?? 'Untitled event',
    startsAt,
    endsAt,
  });

  const created = await apiUnwrap<OrganizerEvent>(
    apiDispatch(organizerApi.endpoints.createEvent.initiate(createBody))
  );
  const newId = (created.id ?? '').trim();
  if (!newId || newId === '0') {
    throw new Error('Create event succeeded but the API did not return a valid event id.');
  }
  const defaults: OrganizerEvent = {
    ...created,
    title: partial?.title ?? 'Untitled event',
    description: '',
    category: 'Music',
    venue: '',
    city: 'Riyadh',
    startsAt,
    endsAt,
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
    eventGallery: [],
    id: newId,
  };
  const ev = { ...defaults, ...partial, id: newId };

  await patchEvent(ev.id, {
    title: ev.title,
    description: ev.description,
    category: ev.category,
    categoryId: ev.categoryId,
    venue: ev.venue,
    city: ev.city,
    regionId: ev.regionId,
    cityId: ev.cityId,
    startsAt: ev.startsAt,
    endsAt: ev.endsAt,
    layoutType: ev.layoutType,
    rows: ev.rows,
    cols: ev.cols,
    rowGap: ev.rowGap,
    colGap: ev.colGap,
    rowGaps: ev.rowGaps,
    colGaps: ev.colGaps,
    capacity: ev.capacity,
    entryMode: ev.entryMode,
    purchaseLimitPerUser: ev.purchaseLimitPerUser,
    multiDaySingleTicket: ev.multiDaySingleTicket,
    recurrence: ev.recurrence ?? undefined,
    occurrences: ev.occurrences,
    postEventMedia: ev.postEventMedia,
  });

  for (const t of ev.ticketTypes) {
    await createEventTicketTypeApi(ev.id, {
      label: t.label,
      defaultPrice: t.defaultPrice,
      quantityLimit: t.quantityLimit,
    });
  }

  let fresh = (await getEvent(ev.id)) ?? ev;
  if (fresh.layoutType !== 'free' && fresh.rows > 0 && fresh.cols > 0) {
    const regenerated =
      (await bulkReplaceEventSeats(fresh.id, {
        layoutType: fresh.layoutType,
        rows: fresh.rows,
        cols: fresh.cols,
        ticketTypeId: resolveNumericTicketTypeId(fresh.ticketTypes),
      })) ?? null;
    fresh = regenerated ?? (await getEvent(fresh.id)) ?? fresh;
  }
  return fresh;
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

function seatMapDimensions(merged: OrganizerEvent): { rows: number; cols: number } {
  const rows = Math.max(1, Math.min(100, merged.rows || 6));
  const cols = Math.max(1, Math.min(100, merged.cols || 10));
  return { rows, cols };
}

export async function patchEvent(
  id: string,
  patch: Partial<
    Pick<
      OrganizerEvent,
      | 'title'
      | 'description'
      | 'category'
      | 'categoryId'
      | 'venue'
      | 'city'
      | 'latitude'
      | 'longitude'
      | 'regionId'
      | 'cityId'
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
      | 'seats'
      | 'entryMode'
      | 'purchaseLimitPerUser'
      | 'multiDaySingleTicket'
      | 'recurrence'
      | 'occurrences'
      | 'postEventMedia'
    >
  > & { layoutType?: LayoutType; entryMode?: EntryMode }
): Promise<OrganizerEvent | null> {
  const current = await getEvent(id);
  if (!current) return null;

  const { seats: seatsPatch, ...eventFields } = patch;
  const merged: OrganizerEvent = { ...current, ...eventFields };
  if (seatsPatch !== undefined) merged.seats = seatsPatch;
  if (eventFields.layoutType === 'free') {
    merged.rows = 0;
    merged.cols = 0;
    merged.seats = [];
  }

  const eventApiPatch: Partial<OrganizerEvent> = { ...eventFields };
  if (eventFields.layoutType === 'free') {
    eventApiPatch.rows = 0;
    eventApiPatch.cols = 0;
  }

  const seating: SeatingPatchOptions = {};
  let needsIndividualSeatSync = false;

  if (merged.layoutType !== 'free') {
    if (shouldBulkReplaceSeatMap(patch, merged)) {
      const { rows, cols } = seatMapDimensions(merged);
      const defaultType = merged.ticketTypes[0];
      seating.regenerate = {
        layoutType: merged.layoutType,
        rows,
        cols,
        replace: true,
        ticketTypeId: resolveNumericTicketTypeId(merged.ticketTypes, defaultType?.id),
        section: merged.layoutType === 'section' ? merged.seats[0]?.section : undefined,
      };
    } else if (seatsPatch?.length) {
      const seatUpdates = tryBuildHomogeneousSeatUpdates(
        current.seats,
        seatsPatch,
        merged.ticketTypes
      );
      if (seatUpdates) {
        seating.seatUpdates = seatUpdates;
      } else {
        needsIndividualSeatSync = true;
      }
    }
  }

  const hasSeating = Boolean(seating.regenerate || seating.seatUpdates);
  const body = buildOrganizerEventPatchBody(eventApiPatch, hasSeating ? seating : undefined);

  let result: OrganizerEvent | null = null;
  if (Object.keys(body).length > 0) {
    result = await patchEventApi(id, body);
  }

  if (merged.layoutType === 'free') {
    return result ?? (await getEvent(id));
  }

  if (needsIndividualSeatSync && seatsPatch?.length) {
    await syncSeatsIndividually(id, seatsPatch, current.seats, merged.ticketTypes);
    const fresh = await getEvent(id);
    return fresh ? mergeSeatsAfterSave(fresh, merged, patch) : fresh;
  }

  if (result) {
    return mergeSeatsAfterSave(result, merged, patch);
  }

  return getEvent(id);
}

export async function createEventTicketTypeApi(
  eventId: string,
  def: { label: string; defaultPrice: number; quantityLimit?: number }
): Promise<void> {
  const body: Record<string, unknown> = {
    name: def.label,
    price: def.defaultPrice,
  };
  if (def.quantityLimit != null && def.quantityLimit >= 1) {
    body.quantity_limit = def.quantityLimit;
  }
  await apiUnwrap(apiDispatch(organizerApi.endpoints.createTicketType.initiate({ eventId, body })));
}

export async function updateEventTicketTypeApi(
  eventId: string,
  ticketTypeId: string,
  def: Partial<{ label: string; defaultPrice: number; quantityLimit: number | undefined }>
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (def.label !== undefined) body.name = def.label;
  if (def.defaultPrice !== undefined) body.price = def.defaultPrice;
  if (def.quantityLimit !== undefined) {
    if (def.quantityLimit != null && def.quantityLimit >= 1) {
      body.quantity_limit = def.quantityLimit;
    } else {
      body.quantity_limit = null;
    }
  }
  await apiUnwrap(apiDispatch(organizerApi.endpoints.patchTicketType.initiate({ eventId, ticketTypeId, body })));
}

export async function deleteEventTicketTypeApi(eventId: string, ticketTypeId: string): Promise<void> {
  await apiUnwrap(apiDispatch(organizerApi.endpoints.deleteTicketType.initiate({ eventId, ticketTypeId })));
}

export async function uploadEventGalleryImageApi(eventId: string, file: File): Promise<void> {
  if (file.size > GALLERY_IMAGE_MAX_BYTES) {
    throw new Error('Each gallery image must be 6 MB or smaller.');
  }
  const fd = new FormData();
  fd.append('image', file);
  await apiUnwrap(apiDispatch(organizerApi.endpoints.postEventGallery.initiate({ eventId, body: fd })));
}

export async function uploadEventCoverImageApi(eventId: string, file: File): Promise<void> {
  if (!file.type || !ACCEPTED_IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
    throw new Error('Cover image must be JPG, PNG, GIF, or WEBP.');
  }
  if (file.size > COVER_IMAGE_MAX_BYTES) {
    throw new Error('Cover image must be 6 MB or smaller.');
  }
  await uploadEventCoverImageWithProgress(eventId, file);
}

export function uploadEventCoverImageWithProgress(
  eventId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  if (!file.type || !ACCEPTED_IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
    return Promise.reject(new Error('Cover image must be JPG, PNG, GIF, or WEBP.'));
  }
  if (file.size > COVER_IMAGE_MAX_BYTES) {
    return Promise.reject(new Error('Cover image must be 6 MB or smaller.'));
  }
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;
  if (!token) return Promise.reject(new Error('You are not authenticated. Please sign in again.'));

  const fd = new FormData();
  fd.append('image', file);
  const url = `${ApiBaseUrl}${ORGANIZER_API_PREFIX}/events/${encodeURIComponent(eventId)}/cover`;

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return;
      const p = Math.max(0, Math.min(100, Math.round((ev.loaded / ev.total) * 100)));
      onProgress?.(p);
    };

    xhr.onerror = () => reject(new Error('Cover image upload failed. Please try again.'));
    xhr.onabort = () => reject(new Error('Cover image upload was cancelled.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      let message = `Cover image upload failed (${xhr.status}).`;
      try {
        const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        const m = typeof parsed?.message === 'string' ? parsed.message : typeof parsed?.error === 'string' ? parsed.error : '';
        if (m) message = m;
      } catch {
        /* noop */
      }
      reject(new Error(message));
    };

    xhr.send(fd);
  });
}

export async function deleteEventGalleryItemApi(eventId: string, itemId: string): Promise<void> {
  await apiUnwrap(apiDispatch(organizerApi.endpoints.deleteEventGalleryItem.initiate({ eventId, itemId })));
}

export async function cancelOccurrence(eventId: string, occurrenceId: string) {
  const e = await getEvent(eventId);
  if (!e) return;
  const occurrences = e.occurrences.map((o) => (o.id === occurrenceId ? { ...o, status: 'cancelled' as const } : o));
  await apiUnwrap(
    apiDispatch(
      organizerApi.endpoints.patchEvent.initiate({
        id: eventId,
        body: organizerEventPatchToApiBody({ occurrences }),
      })
    )
  );
}

/** Demo helper: draft/rejected → submit; ended → archive. Does not PATCH arbitrary statuses. */
export async function simulateLifecycleTick(id: string) {
  const e = await getEvent(id);
  if (!e) return;
  if (e.status === 'draft' || e.status === 'rejected') {
    await publishEvent(id);
    return;
  }
  if (e.status === 'ended') {
    await archiveEvent(id);
    return;
  }
}

export function validateFreeLayoutTotals(event: OrganizerEvent) {
  if (event.layoutType !== 'free') {
    return { ok: true as const, total: 0, capacity: event.capacity };
  }
  const total = event.ticketTypes.reduce((sum, t) => sum + (t.quantityLimit ?? 0), 0);
  return { ok: total <= event.capacity, total, capacity: event.capacity } as const;
}

export function listEventNotifications() {
  return listStoredNotifications();
}
