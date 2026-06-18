import { describe, expect, it, beforeAll } from 'vitest';
import { validateFreeLayoutTotals } from '@/services/eventsService';
import type { OrganizerEvent } from '@/types/domain';
import { setupI18nTest } from '@/test/i18nTestUtils';

describe('event validation', () => {
  beforeAll(async () => {
    await setupI18nTest('en');
  });
  it('flags free layout when ticket limits exceed capacity', () => {
    const ev = {
      layoutType: 'free' as const,
      capacity: 40,
      ticketTypes: [{ id: 't1', label: 'GA', defaultPrice: 0, quantityLimit: 50 }],
    } as unknown as OrganizerEvent;
    const v = validateFreeLayoutTotals(ev);
    expect(v.ok).toBe(false);
    expect(v.total).toBe(50);
    expect(v.capacity).toBe(40);
  });

  it('accepts non-free layouts without quantity checks', () => {
    const ev = {
      layoutType: 'grid' as const,
      capacity: 10,
      ticketTypes: [],
    } as unknown as OrganizerEvent;
    expect(validateFreeLayoutTotals(ev).ok).toBe(true);
  });
});
