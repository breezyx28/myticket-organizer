import type { SeatCell } from '@/types/domain';

export function sortSeatsRowMajor(seats: SeatCell[]): SeatCell[] {
  return [...seats].sort((a, b) => a.row - b.row || a.col - b.col);
}

/** Seat ids from anchor through target in row-major order (inclusive). */
export function seatIdsInRowMajorRange(seats: SeatCell[], anchorId: string, targetId: string): string[] {
  const ordered = sortSeatsRowMajor(seats);
  const ai = ordered.findIndex((s) => s.id === anchorId);
  const bi = ordered.findIndex((s) => s.id === targetId);
  if (ai < 0 || bi < 0) return [targetId];
  const lo = Math.min(ai, bi);
  const hi = Math.max(ai, bi);
  return ordered.slice(lo, hi + 1).map((s) => s.id);
}

export function pruneSeatSelection(selectedIds: Iterable<string>, seats: SeatCell[]): Set<string> {
  const valid = new Set(seats.map((s) => s.id));
  return new Set([...selectedIds].filter((id) => valid.has(id)));
}

export type SeatClickModifier = 'plain' | 'toggle' | 'range';

export function resolveSeatClickModifier(event: {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): SeatClickModifier {
  if (event.shiftKey) return 'range';
  if (event.metaKey || event.ctrlKey) return 'toggle';
  return 'plain';
}

export function nextSeatSelection(
  current: Set<string>,
  seatId: string,
  modifier: SeatClickModifier,
  rangeIds: string[]
): Set<string> {
  if (modifier === 'plain') return new Set([seatId]);
  if (modifier === 'range') return new Set(rangeIds);
  const next = new Set(current);
  if (next.has(seatId)) next.delete(seatId);
  else next.add(seatId);
  return next;
}
