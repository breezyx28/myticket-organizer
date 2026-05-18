import { readNum, readString, toIdString } from '@/lib/api/json';
import type {
  AdminEventNotificationAction,
  AdminEventNotificationData,
  OrganizerNotification,
} from '@/types/domain';

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function mapNotificationData(raw: unknown): AdminEventNotificationData | Record<string, unknown> | null {
  const o = asRecord(raw);
  if (!o) return null;
  const action = readString(o, 'admin_action');
  if (!action) return o;
  return {
    admin_action: action as AdminEventNotificationAction,
    event_id: readNum(o, 'event_id') ?? 0,
    event_code: readString(o, 'event_code'),
    status: readString(o, 'status'),
    ...(readString(o, 'rejection_reason') ? { rejection_reason: readString(o, 'rejection_reason') } : {}),
  };
}

export function mapApiNotificationRow(raw: unknown): OrganizerNotification {
  const o = asRecord(raw) ?? {};
  const relatedId = readNum(o, 'related_entity_id');
  return {
    id: toIdString(o.id),
    kind: readString(o, 'kind') || 'general',
    title: readString(o, 'title') || 'Notification',
    body: readString(o, 'body') || null,
    href: readString(o, 'href') || null,
    data: mapNotificationData(o.data),
    relatedEntityType: readString(o, 'related_entity_type') || null,
    relatedEntityId: relatedId != null ? String(relatedId) : null,
    isRead: o.is_read === true,
    createdAt: readString(o, 'created_at') || new Date().toISOString(),
  };
}

export function isAdminEventNotification(n: OrganizerNotification): boolean {
  const data = n.data;
  return n.kind === 'general' && data != null && typeof data === 'object' && 'admin_action' in data;
}

export function getNotificationEventId(n: OrganizerNotification): string | null {
  const data = n.data;
  if (data && typeof data === 'object' && 'event_id' in data) {
    const id = (data as AdminEventNotificationData).event_id;
    if (id != null && !Number.isNaN(Number(id))) return String(id);
  }
  if (n.relatedEntityType === 'event' && n.relatedEntityId) return n.relatedEntityId;
  return null;
}
