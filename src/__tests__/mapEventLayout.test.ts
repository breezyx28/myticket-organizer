import { describe, expect, it } from 'vitest';
import { mapApiEventToOrganizerEvent, organizerEventPatchToApiBody } from '@/lib/api/mapEvent';

describe('layout API mapping', () => {
  it('reads rows_count and cols_count from GET payload', () => {
    const ev = mapApiEventToOrganizerEvent({
      id: 1,
      layout_type: 'grid',
      rows_count: 8,
      cols_count: 12,
    });
    expect(ev.layoutType).toBe('grid');
    expect(ev.rows).toBe(8);
    expect(ev.cols).toBe(12);
  });

  it('defaults layout to free when omitted', () => {
    const ev = mapApiEventToOrganizerEvent({ id: 1 });
    expect(ev.layoutType).toBe('free');
    expect(ev.rows).toBe(0);
    expect(ev.cols).toBe(0);
  });

  it('PATCH body uses rows_count and cols_count, not nested seats', () => {
    const body = organizerEventPatchToApiBody({
      layoutType: 'grid',
      rows: 6,
      cols: 10,
      seats: [{ id: '1', row: 0, col: 0, ticketTypeId: '2', price: 50, accessibility: false }],
    });
    expect(body.layout_type).toBe('grid');
    expect(body.rows_count).toBe(6);
    expect(body.cols_count).toBe(10);
    expect(body.seats).toBeUndefined();
  });

  it('forces zero dimensions when layout is free', () => {
    const body = organizerEventPatchToApiBody({ layoutType: 'free', rows: 6, cols: 10 });
    expect(body.layout_type).toBe('free');
    expect(body.rows_count).toBe(0);
    expect(body.cols_count).toBe(0);
  });
});
