import type { ScanLog, ScannerAccount } from '@/types/domain';
import { organizerApi } from '@/store/api/organizerApi';
import type { CreateScannerResult, UpdateScannerResult } from '@/lib/api/mapScanner';
import { listEvents } from '@/services/eventsService';
import { apiDispatch, apiUnwrap } from '@/services/apiDispatch';

export type { CreateScannerResult, UpdateScannerResult };

export type CreateScannerInput = {
  name: string;
  email: string;
  password?: string;
  userId?: number;
  eventIds?: string[];
  gateLabel?: string;
};

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

export async function createScanner(input: CreateScannerInput): Promise<CreateScannerResult> {
  const event_ids = (input.eventIds ?? [])
    .map((id) => Number(id))
    .filter((n) => !Number.isNaN(n) && n > 0);
  const password = input.password?.trim();
  const gateLabel = input.gateLabel?.trim();

  return apiUnwrap<CreateScannerResult>(
    apiDispatch(
      organizerApi.endpoints.createScanner.initiate({
        name: input.name.trim(),
        email: input.email.trim(),
        ...(password ? { password } : {}),
        ...(input.userId != null ? { user_id: input.userId } : {}),
        ...(event_ids.length ? { event_ids } : {}),
        ...(gateLabel ? { gate_label: gateLabel } : {}),
      })
    )
  );
}

export type UpdateScannerInput = {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
  emailCredentials?: boolean;
};

export async function updateScanner(input: UpdateScannerInput): Promise<UpdateScannerResult> {
  const name = input.name?.trim();
  const email = input.email?.trim();
  const password = input.password?.trim();
  const body: {
    name?: string;
    email?: string;
    password?: string;
    is_active?: boolean;
    email_credentials?: boolean;
  } = {};
  if (name) body.name = name;
  if (email) body.email = email;
  if (password) body.password = password;
  if (input.isActive !== undefined) body.is_active = input.isActive;
  if (input.emailCredentials) body.email_credentials = true;

  return apiUnwrap<UpdateScannerResult>(
    apiDispatch(
      organizerApi.endpoints.updateScanner.initiate({
        scannerId: input.id,
        ...body,
      })
    )
  );
}

export async function deleteScanner(id: string): Promise<void> {
  await apiUnwrap(
    apiDispatch(organizerApi.endpoints.deleteScanner.initiate(id))
  );
}

/** Assign one or more scanner accounts to an event (bulk gate assignment API). */
export async function bulkAssignScannersToEvent(
  eventId: string,
  scannerAccountIds: string[],
  gateLabel?: string
): Promise<void> {
  if (!scannerAccountIds.length) return;
  await apiUnwrap(
    apiDispatch(
      organizerApi.endpoints.bulkEventScannerAssignments.initiate({
        eventId,
        scannerAccountIds,
        gateLabel,
      })
    )
  );
}

export async function assignScanner(scannerId: string, eventId: string, assign: boolean) {
  if (assign) {
    await bulkAssignScannersToEvent(eventId, [scannerId]);
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
