import type { ScanLog, ScannerAccount } from '@/types/domain';
import { organizerApi } from '@/store/api/organizerApi';
import { listEvents } from '@/services/eventsService';
import { apiDispatch, apiUnwrap } from '@/services/apiDispatch';

export async function listScanners(): Promise<ScannerAccount[]> {
  return apiUnwrap<ScannerAccount[]>(apiDispatch(organizerApi.endpoints.listScanners.initiate()));
}

export async function listScanLogs(): Promise<ScanLog[]> {
  const events = await listEvents();
  const merged: ScanLog[] = [];
  for (const e of events) {
    try {
      const part = await apiUnwrap<ScanLog[]>(
        apiDispatch(organizerApi.endpoints.getEventScanLogs.initiate({ eventId: e.id }))
      );
      merged.push(...part);
    } catch {
      /* skip event */
    }
  }
  merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return merged;
}

/** Documented organizer API does not expose PATCH/DELETE on scanner accounts; use device revoke and unassign instead. */
export async function upsertScanner(scanner: ScannerAccount) {
  void scanner;
  console.warn('[scanners] Account update is not supported by the organizer API.');
}

export async function createScanner(partial: Omit<ScannerAccount, 'id'>): Promise<ScannerAccount> {
  return apiUnwrap<ScannerAccount>(
    apiDispatch(
      organizerApi.endpoints.createScanner.initiate({
        name: partial.name,
        email: partial.email,
        password: null,
      })
    )
  );
}

export async function deleteScanner(id: string) {
  void id;
  console.warn('[scanners] Account delete is not supported by the organizer API.');
}

export async function assignScanner(scannerId: string, eventId: string, assign: boolean) {
  if (assign) {
    await apiUnwrap(apiDispatch(organizerApi.endpoints.assignScanner.initiate({ scannerId, eventId })));
    return;
  }
  const scanners = await listScanners();
  const sc = scanners.find((x) => x.id === scannerId);
  const assignmentId = sc?.assignmentIdsByEventId?.[eventId];
  if (!assignmentId) return;
  await apiUnwrap(
    apiDispatch(organizerApi.endpoints.unassignScanner.initiate({ scannerId, assignmentId }))
  );
}

export async function revokeScannerDevice(scannerId: string, deviceId: string) {
  return apiUnwrap<unknown>(
    apiDispatch(organizerApi.endpoints.revokeScannerDevice.initiate({ scannerId, deviceId }))
  );
}
