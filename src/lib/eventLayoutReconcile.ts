import type { OrganizerEvent } from '@/types/domain';

/**
 * Merge server event with local intent when layout/seat-map PATCH is not reflected yet.
 * Always returns `merged` for non-seat-map saves — never discard in-flight editor fields.
 */
export function reconcilePatchedEvent(
  merged: OrganizerEvent,
  patch: Partial<OrganizerEvent>,
  localBeforeSave: OrganizerEvent
): OrganizerEvent {
  const patchTouchesSeatMap =
    patch.layoutType !== undefined ||
    patch.seats !== undefined ||
    patch.rows !== undefined ||
    patch.cols !== undefined;

  const intendedLayout = patch.layoutType ?? localBeforeSave.layoutType;
  const requestedFreeLayout = patch.layoutType === 'free';
  const intendedNonFree = intendedLayout !== 'free';
  const serverFree = merged.layoutType === 'free';
  const intendedRows = patch.rows ?? localBeforeSave.rows;
  const intendedCols = patch.cols ?? localBeforeSave.cols;
  const intendedSeats = patch.seats ?? localBeforeSave.seats;

  if (serverFree && intendedNonFree && patchTouchesSeatMap && !requestedFreeLayout) {
    return {
      ...merged,
      layoutType: intendedLayout,
      rows: intendedRows,
      cols: intendedCols,
      seats: intendedSeats,
    };
  }

  if (requestedFreeLayout) {
    return {
      ...merged,
      layoutType: 'free',
      rows: 0,
      cols: 0,
      seats: [],
    };
  }

  if (!patchTouchesSeatMap || !intendedNonFree) {
    return merged;
  }

  const serverSeatsMissing = merged.seats.length === 0 && intendedSeats.length > 0;
  const serverDimensionsStale =
    intendedRows > 0 &&
    intendedCols > 0 &&
    (merged.rows !== intendedRows || merged.cols !== intendedCols);

  if (serverSeatsMissing || serverDimensionsStale) {
    return {
      ...merged,
      layoutType: intendedLayout,
      rows: intendedRows,
      cols: intendedCols,
      seats: serverSeatsMissing ? intendedSeats : merged.seats,
    };
  }

  return merged;
}
