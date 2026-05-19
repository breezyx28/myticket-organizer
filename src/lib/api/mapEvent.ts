import type {
  EntryMode,
  EventGalleryItem,
  EventOccurrence,
  EventStatus,
  LayoutType,
  OrganizerEvent,
  RecurrencePattern,
  SeatCell,
  TicketTypeDef,
} from '@/types/domain';
import { readApiNumericId, readNum, readString, toIdString, unwrapEnvelope } from '@/lib/api/json';

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

const STATUSES: EventStatus[] = [
  'draft',
  'pending_approval',
  'rejected',
  'published',
  'sold_out',
  'in_progress',
  'ended',
  'cancelled',
  'archived',
];

function parseStatus(s: string): EventStatus {
  const n = s.replace(/[\s-]+/g, '_').toLowerCase();
  if (n === 'pendingapproval' || n === 'pending_review' || n === 'under_review') return 'pending_approval';
  if (n === 'live' || n === 'active') return 'published';
  if (STATUSES.includes(n as EventStatus)) return n as EventStatus;
  return 'draft';
}

function parseLayout(s: string): LayoutType {
  const n = s.toLowerCase();
  if (n === 'section' || n === 'grid' || n === 'free') return n;
  return 'grid';
}

function parseEntry(s: string): EntryMode {
  const n = s.toLowerCase().replace(/[\s-]+/g, '_');
  if (n === 'multi_scan' || n === 'multiscan') return 'multi_scan';
  return 'one_time';
}

function mapTicketTypes(raw: unknown): TicketTypeDef[] {
  if (!Array.isArray(raw)) return [{ id: 'tt_std', label: 'Standard', defaultPrice: 100 }];
  if (raw.length === 0) return [];
  return raw.map((item, i) => {
    const o = asRecord(item) ?? {};
    return {
      id: toIdString(o.id ?? `tt_${i}`),
      label: readString(o, 'label', 'name', 'title') || `Type ${i + 1}`,
      defaultPrice: readNum(o, 'default_price', 'defaultPrice', 'price') ?? 0,
      quantityLimit: readNum(o, 'quantity_limit', 'quantityLimit') ?? undefined,
    };
  });
}

export function mapApiSeats(raw: unknown): SeatCell[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const o = asRecord(item) ?? {};
    return {
      id: toIdString(o.id ?? `s-${i}`),
      row: readNum(o, 'row', 'row_index') ?? 0,
      col: readNum(o, 'col', 'column', 'col_index') ?? 0,
      section: readString(o, 'section') || undefined,
      ticketTypeId: toIdString(o.ticket_type_id ?? o.ticketTypeId ?? 'tt_std'),
      price: readNum(o, 'price') ?? 0,
      accessibility: Boolean(o.accessibility ?? o.is_accessible),
    };
  });
}

function mapOccurrences(raw: unknown, eventId: string): EventOccurrence[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const o = asRecord(item) ?? {};
    const st = readString(o, 'status', 'state').toLowerCase();
    return {
      id: toIdString(o.id ?? `occ-${i}`),
      eventId,
      startsAt: readString(o, 'starts_at', 'startsAt', 'start_at') || new Date().toISOString(),
      endsAt: readString(o, 'ends_at', 'endsAt', 'end_at') || new Date().toISOString(),
      status: st === 'cancelled' ? 'cancelled' : 'scheduled',
      ticketsSold: readNum(o, 'tickets_sold', 'ticketsSold') ?? 0,
    };
  });
}

function mapEventGallery(root: Record<string, unknown>): EventGalleryItem[] {
  const raw = root.gallery ?? root.gallery_urls ?? root.event_gallery ?? root.images;
  if (!Array.isArray(raw)) return [];
  const out: EventGalleryItem[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const u = item.trim();
      if (u) out.push({ id: u, url: u });
      continue;
    }
    const o = asRecord(item);
    if (!o) continue;
    const id = toIdString(o.id);
    if (!id) continue;
    const abs = readString(o, 'url').trim();
    const rel = readString(o, 'image_url', 'src', 'path').trim();
    const url = abs || rel;
    if (!url) continue;
    out.push({ id, url });
  }
  return out;
}

function optionalIntId(raw: string | undefined): number | null | undefined {
  const t = (raw ?? '').trim();
  if (!t) return undefined;
  if (!/^\d+$/.test(t)) return undefined;
  return Number(t);
}

function mapRecurrence(raw: unknown): RecurrencePattern | null {
  const o = asRecord(raw);
  if (!o) return null;
  const weekdays = o.weekdays ?? o.days_of_week;
  const ws = readString(o, 'window_start', 'windowStart', 'start_date');
  const we = readString(o, 'window_end', 'windowEnd', 'end_date');
  if (!Array.isArray(weekdays) || !ws || !we) return null;
  return {
    weekdays: weekdays.map((x) => Number(x)).filter((n) => !Number.isNaN(n)),
    windowStart: ws,
    windowEnd: we,
  };
}

function asGapMap(raw: unknown): Record<number, number> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const nk = Number(k);
    const nv = typeof v === 'number' ? v : Number(v);
    if (!Number.isNaN(nk) && !Number.isNaN(nv)) out[nk] = nv;
  }
  return Object.keys(out).length ? out : undefined;
}

export function mapApiEventToOrganizerEvent(raw: unknown): OrganizerEvent {
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw) ?? {};
  const id = toIdString(root.id ?? root.event_id);
  const venueName = readString(root, 'venue', 'venue_name', 'venueName');
  const city = readString(root, 'city');

  const postMediaRaw = root.post_event_media ?? root.postEventMedia;
  const postEventMedia: OrganizerEvent['postEventMedia'] = [];
  if (Array.isArray(postMediaRaw)) {
    for (const pm of postMediaRaw) {
      const p = asRecord(pm);
      if (!p) continue;
      const kindRaw = readString(p, 'kind', 'type').toLowerCase();
      const kind = kindRaw === 'video' ? 'video' : 'photo';
      postEventMedia.push({ kind, label: readString(p, 'label', 'name', 'filename') || 'media' });
    }
  }

  const catObj = asRecord(root.category);
  const categoryIdStr = readApiNumericId(root, 'category_id', 'categoryId').trim() || undefined;
  const categoryLabel =
    (catObj ? readString(catObj, 'name', 'name_en', 'title') : '') || readString(root, 'category') || 'General';
  const latitude = readNum(root, 'latitude', 'lat');
  const longitude = readNum(root, 'longitude', 'lng', 'lon');

  return {
    id: id || '0',
    title: readString(root, 'title', 'name') || 'Untitled',
    description: readString(root, 'description', 'body') || '',
    category: categoryLabel,
    categoryId: categoryIdStr || undefined,
    venue: venueName,
    city,
    latitude: latitude != null && Number.isFinite(latitude) ? latitude : null,
    longitude: longitude != null && Number.isFinite(longitude) ? longitude : null,
    regionId: readApiNumericId(root, 'region_id', 'regionId').trim() || undefined,
    cityId: readApiNumericId(root, 'city_id', 'cityId').trim() || undefined,
    startsAt: readString(root, 'starts_at', 'startsAt', 'start_at') || new Date().toISOString(),
    endsAt: readString(root, 'ends_at', 'endsAt', 'end_at') || new Date().toISOString(),
    status: parseStatus(readString(root, 'status', 'state') || 'draft'),
    layoutType: parseLayout(readString(root, 'layout_type', 'layoutType') || 'free'),
    rows: readNum(root, 'rows_count', 'rows', 'row_count') ?? 0,
    cols: readNum(root, 'cols_count', 'cols', 'columns', 'col_count') ?? 0,
    rowGap: readNum(root, 'row_gap', 'rowGap') ?? 8,
    colGap: readNum(root, 'col_gap', 'colGap') ?? 8,
    rowGaps: asGapMap(root.row_gaps ?? root.rowGaps),
    colGaps: asGapMap(root.col_gaps ?? root.colGaps),
    capacity: readNum(root, 'capacity', 'seat_capacity') ?? 0,
    ticketTypes: mapTicketTypes(root.ticket_types ?? root.ticketTypes),
    seats: mapApiSeats(root.seats),
    entryMode: parseEntry(readString(root, 'entry_mode', 'entryMode') || 'one_time'),
    purchaseLimitPerUser: readNum(root, 'purchase_limit_per_user', 'purchaseLimitPerUser') ?? undefined,
    multiDaySingleTicket: Boolean(root.multi_day_single_ticket ?? root.multiDaySingleTicket ?? false),
    recurrence: mapRecurrence(root.recurrence),
    occurrences: mapOccurrences(root.occurrences, id || '0'),
    ticketsSold: readNum(root, 'tickets_sold', 'ticketsSold') ?? 0,
    revenueGross: readNum(root, 'revenue_gross', 'revenueGross', 'gross_revenue') ?? 0,
    waitlistCount: readNum(root, 'waitlist_count', 'waitlistCount') ?? undefined,
    eventGallery: mapEventGallery(root),
    postEventMedia,
    lastChangeLog: undefined,
  };
}

/** Maps dashboard partial event to API PATCH body (snake_case, best-effort). */
export function organizerEventPatchToApiBody(patch: Partial<OrganizerEvent>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (patch.categoryId !== undefined) {
    const t = (patch.categoryId ?? '').trim();
    if (!t) body.category_id = null;
    else {
      const n = optionalIntId(patch.categoryId);
      if (n !== undefined) body.category_id = n;
    }
  }
  if (patch.regionId !== undefined) {
    const t = (patch.regionId ?? '').trim();
    if (!t) body.region_id = null;
    else {
      const n = optionalIntId(patch.regionId);
      if (n !== undefined) body.region_id = n;
    }
  }
  if (patch.cityId !== undefined) {
    const t = (patch.cityId ?? '').trim();
    if (!t) body.city_id = null;
    else {
      const n = optionalIntId(patch.cityId);
      if (n !== undefined) body.city_id = n;
    }
  }
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.category !== undefined) body.category = patch.category;
  if (patch.venue !== undefined) {
    body.venue_name = patch.venue;
    body.venue = patch.venue;
  }
  if (patch.city !== undefined) body.city = patch.city;
  if (patch.latitude !== undefined && patch.latitude !== null && Number.isFinite(patch.latitude)) {
    body.latitude = patch.latitude;
  }
  if (patch.longitude !== undefined && patch.longitude !== null && Number.isFinite(patch.longitude)) {
    body.longitude = patch.longitude;
  }
  if (patch.startsAt !== undefined) body.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) body.ends_at = patch.endsAt;
  if (patch.layoutType !== undefined) body.layout_type = patch.layoutType;
  if (patch.layoutType === 'free') {
    body.rows_count = 0;
    body.cols_count = 0;
  } else {
    if (patch.rows !== undefined) body.rows_count = patch.rows;
    if (patch.cols !== undefined) body.cols_count = patch.cols;
  }
  if (patch.rowGap !== undefined) body.row_gap = patch.rowGap;
  if (patch.colGap !== undefined) body.col_gap = patch.colGap;
  if (patch.rowGaps !== undefined) body.row_gaps = patch.rowGaps;
  if (patch.colGaps !== undefined) body.col_gaps = patch.colGaps;
  if (patch.capacity !== undefined) body.capacity = patch.capacity;
  if (patch.entryMode !== undefined) body.entry_mode = patch.entryMode;
  if (patch.purchaseLimitPerUser !== undefined) body.purchase_limit_per_user = patch.purchaseLimitPerUser;
  if (patch.multiDaySingleTicket !== undefined) body.multi_day_single_ticket = patch.multiDaySingleTicket;
  if (patch.recurrence !== undefined) body.recurrence = patch.recurrence;
  if (patch.occurrences !== undefined) {
    body.occurrences = patch.occurrences.map((o) => ({
      id: o.id,
      starts_at: o.startsAt,
      ends_at: o.endsAt,
      status: o.status,
      tickets_sold: o.ticketsSold,
    }));
  }
  if (patch.postEventMedia !== undefined) {
    body.post_event_media = patch.postEventMedia.map((m) => ({
      kind: m.kind,
      label: m.label,
    }));
  }
  return body;
}

const EVENT_PATCH_DIFF_KEYS: (keyof OrganizerEvent)[] = [
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
  'postEventMedia',
];

/** Fields included when clicking "Save changes" (excludes ticket types, gallery, metrics, status). */
export function diffOrganizerEventPatch(before: OrganizerEvent, after: OrganizerEvent): Partial<OrganizerEvent> {
  const out: Partial<OrganizerEvent> = {};
  for (const k of EVENT_PATCH_DIFF_KEYS) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      (out as Record<string, unknown>)[k] = after[k];
    }
  }
  return out;
}

export function eventIdForPath(id: string): string {
  const n = Number(id);
  if (!Number.isNaN(n) && String(n) === id) return id;
  return id;
}
