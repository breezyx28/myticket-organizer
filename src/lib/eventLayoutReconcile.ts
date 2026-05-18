import type { OrganizerEvent } from '@/types/domain';

/** Merge server event with local intent when layout/seat-map PATCH is not reflected yet. */
export function reconcilePatchedEvent(
  serverEvent: OrganizerEvent | null,
  patch: Partial<OrganizerEvent>,
  localBeforeSave: OrganizerEvent
): OrganizerEvent | null {
  if (!serverEvent) return null;

  const patchTouchesSeatMap =
    patch.layoutType !== undefined ||
    patch.seats !== undefined ||
    patch.rows !== undefined ||
    patch.cols !== undefined;

  const intendedLayout = patch.layoutType ?? localBeforeSave.layoutType;
  const requestedFreeLayout = patch.layoutType === 'free';
  const intendedNonFree = intendedLayout !== 'free';
  const serverFree = serverEvent.layoutType === 'free';

  if (serverFree && intendedNonFree && patchTouchesSeatMap && !requestedFreeLayout) {
    return {
      ...serverEvent,
      layoutType: intendedLayout,
      rows: patch.rows ?? localBeforeSave.rows,
      cols: patch.cols ?? localBeforeSave.cols,
      seats: patch.seats ?? localBeforeSave.seats,
    };
  }

  return serverEvent;
}
