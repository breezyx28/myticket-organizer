import type { ScanLog } from '@/types/domain';
import { mapApiScanLiveRow, parseScanResult } from '@/lib/api/mapScanLive';
import { readString, toIdString, unwrapEnvelope } from '@/lib/api/json';
import { extractPaginatorData } from '@/lib/api/parseResponse';

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

export function mapApiScanLogToScanLog(raw: unknown, fallbackEventId: string): ScanLog {
  const mapped = mapApiScanLiveRow(raw, fallbackEventId);
  if (mapped) return mapped;
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw) ?? {};
  return {
    id: toIdString(root.id ?? root.log_id),
    eventId: toIdString(root.event_id ?? root.eventId) || fallbackEventId,
    scannerId: toIdString(root.scanner_id ?? root.scannerId ?? root.scanner_account_id),
    scannerAccountId: toIdString(root.scanner_account_id) || undefined,
    scannerName: readString(root, 'scanner_name', 'scannerName') || undefined,
    deviceId: toIdString(root.device_id) || undefined,
    ticketRef: readString(root, 'ticket_ref', 'ticketRef', 'reference', 'code'),
    at: readString(root, 'at', 'created_at', 'scanned_at', 'timestamp') || new Date().toISOString(),
    result: parseScanResult(root),
    failureReason: readString(root, 'failure_reason', 'failureReason') || null,
  };
}

export function mapApiScanLogsList(raw: unknown, fallbackEventId: string): ScanLog[] {
  const pag = extractPaginatorData(raw);
  if (pag) {
    return pag.items.map((x) => mapApiScanLogToScanLog(x, fallbackEventId));
  }
  const inner = unwrapEnvelope(raw);
  if (Array.isArray(inner)) return inner.map((x) => mapApiScanLogToScanLog(x, fallbackEventId));
  if (inner && typeof inner === 'object') {
    const o = inner as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data.map((x) => mapApiScanLogToScanLog(x, fallbackEventId));
  }
  return [];
}
