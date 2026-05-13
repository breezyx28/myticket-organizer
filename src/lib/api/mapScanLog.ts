import type { ScanLog } from '@/types/domain';
import { readString, toIdString, unwrapEnvelope } from '@/lib/api/json';
import { extractPaginatorData } from '@/lib/api/parseResponse';

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

export function mapApiScanLogToScanLog(raw: unknown, fallbackEventId: string): ScanLog {
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw) ?? {};
  const resultRaw = readString(root, 'result', 'outcome', 'status').toLowerCase();
  let result: ScanLog['result'] = 'invalid';
  if (resultRaw === 'ok' || resultRaw === 'success' || resultRaw === 'valid') result = 'ok';
  else if (resultRaw === 'duplicate' || resultRaw === 'already_used') result = 'duplicate';

  return {
    id: toIdString(root.id ?? root.log_id),
    eventId: toIdString(root.event_id ?? root.eventId) || fallbackEventId,
    scannerId: toIdString(root.scanner_id ?? root.scannerId),
    ticketRef: readString(root, 'ticket_ref', 'ticketRef', 'reference', 'code'),
    at: readString(root, 'at', 'created_at', 'scanned_at', 'timestamp') || new Date().toISOString(),
    result,
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
