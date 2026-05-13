import type { BookingActivity } from '@/types/domain';
import { readNum, readString, toIdString, unwrapEnvelope } from '@/lib/api/json';
import { laravelPaginatorShellSchema } from '@/schemas/organizer/responses/shared';

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

export function mapOrderRowToBookingActivity(row: unknown, eventId: string, eventTitle: string): BookingActivity | null {
  const root = asRecord(unwrapEnvelope(row)) ?? asRecord(row) ?? {};
  const id = toIdString(root.id);
  if (!id) return null;
  return {
    id,
    eventId: toIdString(root.event_id ?? root.eventId) || eventId,
    eventTitle,
    buyerEmail: readString(root, 'buyer_email', 'buyerEmail', 'email', 'customer_email', 'user_email'),
    qty: readNum(root, 'quantity', 'qty', 'ticket_count') ?? 1,
    at: readString(root, 'created_at', 'createdAt', 'placed_at', 'updated_at') || new Date().toISOString(),
    amount: readNum(root, 'total', 'amount', 'grand_total', 'total_amount', 'price_total') ?? 0,
    seatRef: readString(root, 'seat_ref', 'seatRef', 'seat_label') || undefined,
    ticketType: readString(root, 'ticket_type', 'ticketType', 'ticket_type_name') || undefined,
  };
}

export function mapOrdersPaginator(raw: unknown, eventId: string, eventTitle: string): BookingActivity[] {
  const parsed = laravelPaginatorShellSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.data
    .map((row) => mapOrderRowToBookingActivity(row, eventId, eventTitle))
    .filter((x): x is BookingActivity => x != null);
}

export function mapTicketRowToTypeQty(row: unknown): { label: string; qty: number } | null {
  const root = asRecord(unwrapEnvelope(row)) ?? asRecord(row) ?? {};
  const label = readString(root, 'ticket_type', 'ticketType', 'type', 'name', 'label');
  const qty = readNum(root, 'quantity', 'qty') ?? 1;
  if (!label) return null;
  return { label, qty };
}

export function mapTicketsPaginatorToDistribution(raw: unknown): { label: string; qty: number }[] {
  const parsed = laravelPaginatorShellSchema.safeParse(raw);
  if (!parsed.success) return [];
  const dist = new Map<string, number>();
  for (const row of parsed.data.data) {
    const m = mapTicketRowToTypeQty(row);
    if (!m) continue;
    dist.set(m.label, (dist.get(m.label) ?? 0) + m.qty);
  }
  return Array.from(dist.entries()).map(([label, qty]) => ({ label, qty }));
}
