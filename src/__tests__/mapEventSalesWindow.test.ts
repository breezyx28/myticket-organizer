import { describe, expect, it } from 'vitest';
import { mapApiEventToOrganizerEvent, organizerEventPatchToApiBody } from '@/lib/api/mapEvent';
import { formatApiFieldKey } from '@/lib/i18n/apiFieldLabel';
import { dateInputToIsoDate, toDateInput } from '@/lib/datetimeLocal';

describe('ticket sales window', () => {
  it('maps ticket_sales_* from GET response', () => {
    const ev = mapApiEventToOrganizerEvent({
      data: {
        id: 1,
        title: 'Concert',
        starts_at: '2026-07-01T18:00:00.000000Z',
        ends_at: '2026-07-01T22:00:00.000000Z',
        ticket_sales_starts_at: '2026-06-21T00:00:00.000000Z',
        ticket_sales_ends_at: '2026-06-29T00:00:00.000000Z',
        status: 'draft',
      },
    });
    expect(ev.ticketSalesStartsAt).toBe('2026-06-21T00:00:00.000000Z');
    expect(ev.ticketSalesEndsAt).toBe('2026-06-29T00:00:00.000000Z');
  });

  it('PATCH body sends both canonical ticket_sales keys', () => {
    const body = organizerEventPatchToApiBody({
      ticketSalesStartsAt: '2026-06-21T00:00:00.000000Z',
      ticketSalesEndsAt: '2026-06-29T00:00:00.000000Z',
    });
    expect(body.ticket_sales_starts_at).toBeTruthy();
    expect(body.ticket_sales_ends_at).toBeTruthy();
    expect(new Date(String(body.ticket_sales_starts_at)).toISOString().slice(0, 10)).toBe('2026-06-21');
    expect(new Date(String(body.ticket_sales_ends_at)).toISOString().slice(0, 10)).toBe('2026-06-29');
  });

  it('promotes recurrence windowStart/windowEnd to top-level ticket_sales_*', () => {
    const body = organizerEventPatchToApiBody({
      recurrence: { weekdays: [], windowStart: '2026-06-23', windowEnd: '2026-06-29' },
    });
    expect(body.recurrence).toEqual({
      weekdays: [],
      window_start: '2026-06-23',
      window_end: '2026-06-29',
    });
    expect(body.ticket_sales_starts_at).toBeTruthy();
    expect(body.ticket_sales_ends_at).toBeTruthy();
    expect(toDateInput(String(body.ticket_sales_starts_at))).toBe('2026-06-23');
    expect(toDateInput(String(body.ticket_sales_ends_at))).toBe('2026-06-29');
  });

  it('converts date input helpers round-trip', () => {
    const iso = dateInputToIsoDate('2026-06-21');
    expect(toDateInput(iso)).toBe('2026-06-21');
  });

  it('resolves ticket_sales_starts_at field label', () => {
    expect(formatApiFieldKey('ticket_sales_starts_at')).toContain('Sales');
  });
});
