import { organizerEventPatchToApiBody } from '@/lib/api/mapEvent';
import type { LayoutType, OrganizerEvent, SeatCell, TicketTypeDef } from '@/types/domain';

export type SeatUpdatesApiPayload = {
  seatIds: number[];
  ticketTypeId?: number;
  priceOverride?: number;
};

export type SeatingRegenerateOptions = {
  layoutType: LayoutType;
  rows: number;
  cols: number;
  replace?: boolean;
  ticketTypeId?: number;
  section?: string;
};

export type SeatingPatchOptions = {
  regenerate?: SeatingRegenerateOptions;
  seatUpdates?: SeatUpdatesApiPayload;
};

export function resolveNumericTicketTypeId(
  ticketTypes: TicketTypeDef[],
  preferredId?: string
): number | undefined {
  if (preferredId && /^\d+$/.test(preferredId.trim())) {
    return Number(preferredId);
  }
  for (const t of ticketTypes) {
    if (/^\d+$/.test(t.id.trim())) return Number(t.id);
  }
  return undefined;
}

function seatCellChanged(before: SeatCell, after: SeatCell): boolean {
  return (
    before.ticketTypeId !== after.ticketTypeId ||
    before.price !== after.price ||
    before.accessibility !== after.accessibility ||
    (before.section ?? '') !== (after.section ?? '')
  );
}

/** One `seating.seat_updates` block when every changed seat gets the same type + price. */
export function tryBuildHomogeneousSeatUpdates(
  prevSeats: SeatCell[],
  nextSeats: SeatCell[],
  ticketTypes: TicketTypeDef[]
): SeatUpdatesApiPayload | null {
  const prevById = new Map(prevSeats.map((s) => [s.id, s]));
  const changed: SeatCell[] = [];
  for (const seat of nextSeats) {
    if (!/^\d+$/.test(seat.id.trim())) continue;
    const prev = prevById.get(seat.id);
    if (!prev || !seatCellChanged(prev, seat)) continue;
    changed.push(seat);
  }
  if (changed.length === 0) return null;

  const ticketTypeId = changed[0]!.ticketTypeId;
  const price = changed[0]!.price;
  if (!changed.every((s) => s.ticketTypeId === ticketTypeId && s.price === price)) {
    return null;
  }

  const ttNum = resolveNumericTicketTypeId(ticketTypes, ticketTypeId);
  return {
    seatIds: changed.map((s) => Number(s.id)),
    ...(ttNum != null ? { ticketTypeId: ttNum } : {}),
    priceOverride: price,
  };
}

export function seatingOptionsToApiBody(opts: SeatingPatchOptions): Record<string, unknown> {
  const seating: Record<string, unknown> = {};

  if (opts.regenerate) {
    const r = opts.regenerate;
    seating.regenerate = true;
    seating.replace = r.replace ?? true;
    seating.layout_type = r.layoutType;
    seating.rows = r.rows;
    seating.cols = r.cols;
    if (r.ticketTypeId != null) seating.ticket_type_id = r.ticketTypeId;
    if (r.section) seating.section = r.section;
  }

  if (opts.seatUpdates && opts.seatUpdates.seatIds.length > 0) {
    const u = opts.seatUpdates;
    seating.seat_updates = {
      seat_ids: u.seatIds,
      ...(u.ticketTypeId != null ? { ticket_type_id: u.ticketTypeId } : {}),
      ...(u.priceOverride != null ? { price_override: u.priceOverride } : {}),
    };
  }

  return Object.keys(seating).length ? seating : {};
}

export function buildOrganizerEventPatchBody(
  patch: Partial<OrganizerEvent>,
  seating?: SeatingPatchOptions
): Record<string, unknown> {
  const body = organizerEventPatchToApiBody(patch);
  if (seating) {
    const seatingBody = seatingOptionsToApiBody(seating);
    if (Object.keys(seatingBody).length > 0) {
      body.seating = seatingBody;
    }
  }
  return body;
}
