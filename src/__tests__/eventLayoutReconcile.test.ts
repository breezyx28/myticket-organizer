import { describe, expect, it } from 'vitest';
import { reconcilePatchedEvent } from '@/lib/eventLayoutReconcile';
import type { OrganizerEvent } from '@/types/domain';

function baseEvent(overrides: Partial<OrganizerEvent> = {}): OrganizerEvent {
  return {
    id: '1',
    title: 'Test',
    description: '',
    category: 'Music',
    venue: '',
    city: 'Riyadh',
    startsAt: new Date().toISOString(),
    endsAt: new Date().toISOString(),
    status: 'draft',
    layoutType: 'free',
    rows: 6,
    cols: 10,
    rowGap: 8,
    colGap: 8,
    capacity: 60,
    ticketTypes: [{ id: '1', label: 'Standard', defaultPrice: 100 }],
    seats: [],
    entryMode: 'one_time',
    multiDaySingleTicket: false,
    occurrences: [],
    ticketsSold: 0,
    revenueGross: 0,
    eventGallery: [],
    postEventMedia: [],
    ...overrides,
  };
}

describe('reconcilePatchedEvent', () => {
  it('preserves grid when user switches from free and server still returns free', () => {
    const local = baseEvent({ layoutType: 'free', seats: [] });
    const server = baseEvent({ layoutType: 'free', seats: [] });
    const seats = [{ id: 's-0-0', row: 0, col: 0, ticketTypeId: '1', price: 100, accessibility: false }];
    const patch = { layoutType: 'grid' as const, rows: 6, cols: 10, seats };

    const reconciled = reconcilePatchedEvent(server, patch, local);
    expect(reconciled?.layoutType).toBe('grid');
    expect(reconciled?.seats).toHaveLength(1);
  });

  it('does not override when user explicitly selects free', () => {
    const local = baseEvent({ layoutType: 'grid', seats: [{ id: 's', row: 0, col: 0, ticketTypeId: '1', price: 1, accessibility: false }] });
    const server = baseEvent({ layoutType: 'grid' });
    const patch = { layoutType: 'free' as const, seats: [] };

    const reconciled = reconcilePatchedEvent(server, patch, local);
    expect(reconciled?.layoutType).toBe('grid');
  });

  it('returns server event when layouts already match', () => {
    const ev = baseEvent({ layoutType: 'section' });
    const reconciled = reconcilePatchedEvent(ev, { layoutType: 'section' }, ev);
    expect(reconciled).toBe(ev);
  });
});
