import { describe, expect, it } from 'vitest';
import {
  nextSeatSelection,
  resolveSeatClickModifier,
  seatIdsInRowMajorRange,
} from '@/lib/seatSelection';
import type { SeatCell } from '@/types/domain';

const seats: SeatCell[] = [
  { id: 'a', row: 0, col: 0, ticketTypeId: '1', price: 10, accessibility: false },
  { id: 'b', row: 0, col: 1, ticketTypeId: '1', price: 10, accessibility: false },
  { id: 'c', row: 1, col: 0, ticketTypeId: '1', price: 10, accessibility: false },
];

describe('seatSelection', () => {
  it('selects row-major range between anchor and target', () => {
    expect(seatIdsInRowMajorRange(seats, 'a', 'c')).toEqual(['a', 'b', 'c']);
    expect(seatIdsInRowMajorRange(seats, 'c', 'a')).toEqual(['a', 'b', 'c']);
  });

  it('detects modifier keys', () => {
    expect(resolveSeatClickModifier({ shiftKey: true, metaKey: false, ctrlKey: false })).toBe('range');
    expect(resolveSeatClickModifier({ shiftKey: false, metaKey: true, ctrlKey: false })).toBe('toggle');
    expect(resolveSeatClickModifier({ shiftKey: false, metaKey: false, ctrlKey: false })).toBe('plain');
  });

  it('toggles membership on ctrl click', () => {
    const first = nextSeatSelection(new Set(['a']), 'b', 'toggle', []);
    expect([...first].sort()).toEqual(['a', 'b']);
    const second = nextSeatSelection(first, 'b', 'toggle', []);
    expect([...second]).toEqual(['a']);
  });
});
