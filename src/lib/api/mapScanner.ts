import type { ScannerAccount } from '@/types/domain';
import { readBool, readString, toIdString, unwrapEnvelope } from '@/lib/api/json';

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function mapAssignments(raw: unknown): { eventIds: string[]; assignmentIdsByEventId: Record<string, string> } {
  const eventIds: string[] = [];
  const assignmentIdsByEventId: Record<string, string> = {};
  if (!Array.isArray(raw)) return { eventIds, assignmentIdsByEventId };
  for (const row of raw) {
    const o = asRecord(row) ?? {};
    const eid = toIdString(o.event_id ?? o.eventId);
    const aid = toIdString(o.id ?? o.assignment_id ?? o.assignmentId);
    if (eid) {
      eventIds.push(eid);
      if (aid) assignmentIdsByEventId[eid] = aid;
    }
  }
  return { eventIds, assignmentIdsByEventId };
}

export function mapApiScannerToScannerAccount(raw: unknown): ScannerAccount {
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw) ?? {};
  const { eventIds, assignmentIdsByEventId } = mapAssignments(root.assignments ?? root.event_assignments);
  const active = readBool(root, 'active', 'is_active');
  return {
    id: toIdString(root.id ?? root.scanner_id),
    name: readString(root, 'name', 'display_name'),
    email: readString(root, 'email'),
    active: active !== undefined ? active : true,
    assignedEventIds: eventIds.length ? eventIds : (Array.isArray(root.assigned_event_ids) ? (root.assigned_event_ids as unknown[]).map(toIdString) : []),
    assignmentIdsByEventId: Object.keys(assignmentIdsByEventId).length ? assignmentIdsByEventId : undefined,
  };
}

export function mapApiScannersList(raw: unknown): ScannerAccount[] {
  const inner = unwrapEnvelope(raw);
  if (Array.isArray(inner)) return inner.map(mapApiScannerToScannerAccount);
  if (inner && typeof inner === 'object') {
    const o = inner as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data.map(mapApiScannerToScannerAccount);
  }
  return [];
}
