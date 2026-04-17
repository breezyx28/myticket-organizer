import type { ScannerAccount } from '@/types/domain';
import { loadState, updateState } from '@/services/organizerStore';

const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

export async function listScanners(): Promise<ScannerAccount[]> {
  await delay();
  return loadState().scanners;
}

export async function listScanLogs() {
  await delay();
  return loadState().scanLogs;
}

export function upsertScanner(sc: ScannerAccount) {
  updateState((s) => {
    const i = s.scanners.findIndex((x) => x.id === sc.id);
    if (i === -1) s.scanners.push(sc);
    else s.scanners[i] = sc;
  });
}

export function createScanner(partial: Omit<ScannerAccount, 'id'>): ScannerAccount {
  const sc: ScannerAccount = {
    id: `sc-${Date.now()}`,
    ...partial,
  };
  upsertScanner(sc);
  return sc;
}

export function deleteScanner(id: string) {
  updateState((s) => {
    s.scanners = s.scanners.filter((x) => x.id !== id);
  });
}

export function assignScanner(scannerId: string, eventId: string, assign: boolean) {
  updateState((s) => {
    const sc = s.scanners.find((x) => x.id === scannerId);
    if (!sc) return;
    if (assign) {
      if (!sc.assignedEventIds.includes(eventId)) sc.assignedEventIds.push(eventId);
    } else {
      sc.assignedEventIds = sc.assignedEventIds.filter((e) => e !== eventId);
    }
  });
}
