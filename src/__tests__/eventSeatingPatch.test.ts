import { describe, expect, it } from 'vitest';
import {
  buildOrganizerEventPatchBody,
  tryBuildHomogeneousSeatUpdates,
} from '@/lib/api/eventSeatingPatch';
import type { SeatCell } from '@/types/domain';

const seats = (items: Partial<SeatCell>[]): SeatCell[] =>
  items.map((s, i) => ({
    id: s.id ?? String(i + 1),
    row: s.row ?? 0,
    col: s.col ?? i,
    ticketTypeId: s.ticketTypeId ?? '5',
    price: s.price ?? 100,
    accessibility: s.accessibility ?? false,
    ...s,
  }));

describe('eventSeatingPatch', () => {
  it('builds seating.regenerate on unified PATCH body', () => {
    const body = buildOrganizerEventPatchBody(
      { layoutType: 'grid', rows: 8, cols: 12 },
      {
        regenerate: {
          layoutType: 'grid',
          rows: 8,
          cols: 12,
          replace: true,
          ticketTypeId: 5,
        },
      }
    );
    expect(body.layout_type).toBe('grid');
    expect(body.rows_count).toBe(8);
    const seating = body.seating as Record<string, unknown>;
    expect(seating.regenerate).toBe(true);
    expect(seating.replace).toBe(true);
    expect(seating.rows).toBe(8);
    expect(seating.ticket_type_id).toBe(5);
  });

  it('builds seating.seat_updates for homogeneous bulk edit', () => {
    const body = buildOrganizerEventPatchBody(
      {},
      {
        seatUpdates: { seatIds: [101, 102], ticketTypeId: 5, priceOverride: 199.5 },
      }
    );
    const updates = (body.seating as Record<string, unknown>).seat_updates as Record<string, unknown>;
    expect(updates.seat_ids).toEqual([101, 102]);
    expect(updates.ticket_type_id).toBe(5);
    expect(updates.price_override).toBe(199.5);
  });

  it('detects homogeneous seat changes', () => {
    const prev = seats([
      { id: '10', price: 100, ticketTypeId: '5' },
      { id: '11', price: 100, ticketTypeId: '5' },
    ]);
    const next = seats([
      { id: '10', price: 150, ticketTypeId: '5' },
      { id: '11', price: 150, ticketTypeId: '5' },
    ]);
    const payload = tryBuildHomogeneousSeatUpdates(prev, next, [{ id: '5', label: 'VIP', defaultPrice: 150 }]);
    expect(payload?.seatIds).toEqual([10, 11]);
    expect(payload?.priceOverride).toBe(150);
    expect(payload?.ticketTypeId).toBe(5);
  });

  it('returns null for heterogeneous seat changes', () => {
    const prev = seats([{ id: '10', price: 100 }, { id: '11', price: 100 }]);
    const next = seats([{ id: '10', price: 150 }, { id: '11', price: 200 }]);
    expect(tryBuildHomogeneousSeatUpdates(prev, next, [])).toBeNull();
  });
});
