import type { ScanLiveBootstrap, ScanLiveRow, ScanLiveStats, ScanResult } from '@/types/domain';
import { readNum, readString, toIdString, unwrapEnvelope } from '@/lib/api/json';

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

const SCAN_FAILURE_REASON_LABELS: Record<string, string> = {
  scanner_not_owned_by_event_organizer: 'Scanner is not owned by this event organizer',
};

/** Presenter-friendly label for API `failure_reason` codes (handoff § organizer isolation). */
export function formatScanFailureReason(reason: string | null | undefined): string | null {
  const code = reason?.trim();
  if (!code) return null;
  return SCAN_FAILURE_REASON_LABELS[code] ?? code.replace(/_/g, ' ');
}

export function parseScanResult(raw: unknown): ScanResult {
  const s = readString(asRecord(raw) ?? {}, 'result', 'outcome', 'status').toLowerCase();
  if (s === 'ok' || s === 'success' || s === 'valid') return 'ok';
  if (s === 'duplicate' || s === 'already_used') return 'duplicate';
  if (s === 'expired') return 'expired';
  if (s === 'wrong_event' || s === 'wrong event') return 'wrong_event';
  return 'invalid';
}

export function mapApiScanLiveRow(raw: unknown, fallbackEventId: string): ScanLiveRow | null {
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw);
  if (!root) return null;
  const id = toIdString(root.id ?? root.log_id);
  if (!id) return null;
  return {
    id,
    eventId: toIdString(root.event_id ?? root.eventId) || fallbackEventId,
    scannerId: toIdString(root.scanner_id ?? root.scannerId ?? root.scanner_account_id),
    scannerAccountId: toIdString(root.scanner_account_id ?? root.scannerAccountId) || undefined,
    scannerName: readString(root, 'scanner_name', 'scannerName', 'name') || undefined,
    deviceId: toIdString(root.device_id ?? root.deviceId) || undefined,
    ticketRef: readString(root, 'ticket_ref', 'ticketRef', 'reference', 'code', 'ticket_code'),
    at: readString(root, 'scanned_at', 'at', 'created_at', 'timestamp') || new Date().toISOString(),
    result: parseScanResult(root),
    failureReason: readString(root, 'failure_reason', 'failureReason') || null,
  };
}

export function mapApiScanLiveStats(raw: unknown): ScanLiveStats {
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw) ?? {};
  const stats = asRecord(root.stats) ?? root;
  return {
    ok: readNum(stats, 'ok') ?? 0,
    duplicate: readNum(stats, 'duplicate') ?? 0,
    invalid: readNum(stats, 'invalid') ?? 0,
    expired: readNum(stats, 'expired') ?? 0,
    wrong_event: readNum(stats, 'wrong_event', 'wrongEvent') ?? 0,
    total: readNum(stats, 'total') ?? 0,
    lastScanAt: readString(stats, 'last_scan_at', 'lastScanAt') || null,
    activeScanners: readNum(stats, 'active_scanners', 'activeScanners') ?? undefined,
  };
}

export function mapApiScanLiveBootstrap(raw: unknown): ScanLiveBootstrap {
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw) ?? {};
  const transportRaw = readString(root, 'transport').toLowerCase();
  const transport = transportRaw === 'polling' ? 'polling' : 'reverb';
  const fallbackRaw = asRecord(root.fallback);
  const eventsRaw = asRecord(root.events);
  const events: Record<string, string> | undefined = eventsRaw
    ? Object.fromEntries(
        Object.entries(eventsRaw).map(([k, v]) => [k, String(v)])
      )
    : undefined;

  return {
    transport,
    channel: readString(root, 'channel') || undefined,
    authEndpoint: readString(root, 'auth_endpoint', 'authEndpoint') || undefined,
    initialStats: mapApiScanLiveStats(root.initial_stats ?? root.initialStats ?? {}),
    events,
    fallback: fallbackRaw
      ? {
          transport: 'polling',
          endpoint: readString(fallbackRaw, 'endpoint') || undefined,
        }
      : undefined,
  };
}

export function mapApiScanBatchPayload(raw: unknown, fallbackEventId: string): ScanLiveRow[] {
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw) ?? {};
  const payload = asRecord(root.payload) ?? root;
  const eventId = toIdString(payload.event_id ?? payload.eventId) || fallbackEventId;
  const items = payload.items;
  if (!Array.isArray(items)) return [];
  return items.map((item) => mapApiScanLiveRow(item, eventId)).filter((x): x is ScanLiveRow => x != null);
}

export function echoChannelFromApi(channel: string, eventId: string): string {
  const stripped = channel.replace(/^private-/, '');
  if (stripped) return stripped;
  return `organizer.event.${eventId}.scans`;
}

export const SCAN_LIVE_ROW_CAP = 80;

export function prependScanRows(existing: ScanLiveRow[], incoming: ScanLiveRow[]): ScanLiveRow[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(existing.map((r) => r.id));
  const fresh = incoming.filter((r) => !seen.has(r.id));
  if (fresh.length === 0) return existing;
  return [...fresh, ...existing].slice(0, SCAN_LIVE_ROW_CAP);
}

export function mergeScanRows(existing: ScanLiveRow[], incoming: ScanLiveRow[]): ScanLiveRow[] {
  if (incoming.length === 0) return existing;
  const byId = new Map<string, ScanLiveRow>();
  for (const row of existing) byId.set(row.id, row);
  for (const row of incoming) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, SCAN_LIVE_ROW_CAP);
}

export function newestScanTimestamp(rows: ScanLiveRow[], stats?: ScanLiveStats): string | undefined {
  const fromStats = stats?.lastScanAt?.trim();
  if (fromStats) return fromStats;
  if (rows.length === 0) return undefined;
  return rows.reduce((latest, row) => {
    return new Date(row.at).getTime() > new Date(latest).getTime() ? row.at : latest;
  }, rows[0]!.at);
}
