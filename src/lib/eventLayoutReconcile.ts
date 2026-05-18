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
  const intendedRows = patch.rows ?? localBeforeSave.rows;
  const intendedCols = patch.cols ?? localBeforeSave.cols;
  const intendedSeats = patch.seats ?? localBeforeSave.seats;

  if (serverFree && intendedNonFree && patchTouchesSeatMap && !requestedFreeLayout) {
    return {
      ...serverEvent,
      layoutType: intendedLayout,
      rows: intendedRows,
      cols: intendedCols,
      seats: intendedSeats,
    };
  }

  if (requestedFreeLayout) {
    return {
      ...serverEvent,
      layoutType: 'free',
      rows: 0,
      cols: 0,
      seats: [],
    };
  }

  if (!patchTouchesSeatMap || !intendedNonFree) {
    return serverEvent;
  }

  const serverSeatsMissing = serverEvent.seats.length === 0 && intendedSeats.length > 0;
  const serverDimensionsStale =
    intendedRows > 0 &&
    intendedCols > 0 &&
    (serverEvent.rows !== intendedRows || serverEvent.cols !== intendedCols);

  if (serverSeatsMissing || serverDimensionsStale) {
    return {
      ...serverEvent,
      layoutType: intendedLayout,
      rows: intendedRows,
      cols: intendedCols,
      seats: serverSeatsMissing ? intendedSeats : serverEvent.seats,
    };
  }

  return serverEvent;
}
