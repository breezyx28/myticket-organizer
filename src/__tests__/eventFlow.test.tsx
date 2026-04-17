import { describe, expect, it } from 'vitest';
import { resetState } from '@/services/organizerStore';
import {
  cancelEvent,
  cancelOccurrence,
  duplicateEvent,
  getEvent,
  simulateLifecycleTick,
  validateFreeLayoutTotals,
} from '@/services/eventsService';

describe('event flow (mock store)', () => {
  it('duplicates and cancels an event', async () => {
    resetState();
    const before = await getEvent('evt-arch-1');
    expect(before).not.toBeNull();
    const copy = duplicateEvent('evt-arch-1');
    expect(copy).not.toBeNull();
    expect(copy?.status).toBe('draft');
    if (copy) {
      cancelEvent(copy.id);
      const gone = await getEvent(copy.id);
      expect(gone?.status).toBe('cancelled');
    }
  });

  it('validates free layout limits and handles occurrence cancellation', async () => {
    resetState();
    const free = await getEvent('evt-draft-1');
    expect(free).not.toBeNull();
    if (free) {
      const validation = validateFreeLayoutTotals(free);
      expect(validation.total).toBeGreaterThan(0);
      expect(validation.capacity).toBe(free.capacity);
    }

    const recurring = await getEvent('evt-live-1');
    expect(recurring).not.toBeNull();
    if (recurring && recurring.occurrences.length > 0) {
      const targetOccurrenceId = recurring.occurrences[0].id;
      cancelOccurrence(recurring.id, targetOccurrenceId);
      const updated = await getEvent(recurring.id);
      expect(updated?.occurrences.find((o) => o.id === targetOccurrenceId)?.status).toBe('cancelled');
    }
  });

  it('progresses lifecycle status in order', async () => {
    resetState();
    const draft = duplicateEvent('evt-live-1');
    expect(draft).not.toBeNull();
    if (!draft) return;
    simulateLifecycleTick(draft.id);
    expect((await getEvent(draft.id))?.status).toBe('published');
    simulateLifecycleTick(draft.id);
    expect((await getEvent(draft.id))?.status).toBe('in_progress');
  });
});
