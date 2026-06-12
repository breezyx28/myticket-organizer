import type { Conversation, ConversationMessage, ConversationParticipant, MarketplaceMetadata } from '@/types/domain';
import { readBool, readString, toIdString, unwrapEnvelope } from '@/lib/api/json';

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function mapMetadata(raw: unknown): MarketplaceMetadata | undefined {
  const o = asRecord(raw);
  if (!o) return undefined;
  const targetType = readString(o, 'target_type', 'targetType').toLowerCase();
  const targetId = toIdString(o.target_id ?? o.targetId);
  if (targetType !== 'talent' && targetType !== 'vendor') return undefined;
  return {
    targetType,
    targetId,
    brief: readString(o, 'brief') || undefined,
    eventId: toIdString(o.event_id ?? o.eventId) || undefined,
  };
}

function mapParticipant(raw: unknown): ConversationParticipant | null {
  const o = asRecord(raw);
  if (!o) return null;
  const user = asRecord(o.user);
  const role = readString(o, 'role').toLowerCase();
  if (role !== 'organizer' && role !== 'talent' && role !== 'vendor') return null;
  return {
    id: toIdString(o.id),
    userId: toIdString(o.user_id ?? o.userId),
    role,
    displayName: user ? readString(user, 'full_name', 'name', 'display_name') : readString(o, 'display_name', 'name'),
    email: user ? readString(user, 'email') || undefined : undefined,
  };
}

export function mapApiConversation(raw: unknown): Conversation {
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw) ?? {};
  const statusRaw = readString(root, 'status').toLowerCase();
  const participantsRaw = root.participants;
  const participants: ConversationParticipant[] = [];
  if (Array.isArray(participantsRaw)) {
    for (const p of participantsRaw) {
      const mapped = mapParticipant(p);
      if (mapped) participants.push(mapped);
    }
  }
  return {
    id: toIdString(root.id),
    type: readString(root, 'type') || 'marketplace',
    subject: readString(root, 'subject', 'topic') || 'Conversation',
    status: statusRaw === 'closed' ? 'closed' : 'open',
    contextType: readString(root, 'context_type', 'contextType') || undefined,
    contextId: toIdString(root.context_id ?? root.contextId) || undefined,
    metadata: mapMetadata(root.metadata),
    lastMessageAt: readString(root, 'last_message_at', 'lastMessageAt') || undefined,
    createdAt: readString(root, 'created_at', 'createdAt') || new Date().toISOString(),
    updatedAt: readString(root, 'updated_at', 'updatedAt') || new Date().toISOString(),
    participants,
    unread: readBool(root, 'unread') ?? false,
  };
}

export function mapApiConversationsList(raw: unknown): Conversation[] {
  const inner = unwrapEnvelope(raw);
  if (Array.isArray(inner)) return inner.map(mapApiConversation);
  if (inner && typeof inner === 'object') {
    const o = inner as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data.map(mapApiConversation);
  }
  return [];
}

export function mapApiConversationMessage(raw: unknown): ConversationMessage {
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw) ?? {};
  return {
    id: toIdString(root.id),
    conversationId: toIdString(root.conversation_id ?? root.conversationId),
    senderUserId: toIdString(root.sender_user_id ?? root.senderUserId),
    senderRole: readString(root, 'sender_role', 'senderRole') || 'organizer',
    body: readString(root, 'body', 'message', 'content'),
    attachmentUrl: readString(root, 'attachment_url', 'attachmentUrl') || undefined,
    readAt: readString(root, 'read_at', 'readAt') || undefined,
    createdAt: readString(root, 'created_at', 'createdAt') || new Date().toISOString(),
  };
}

export function mapApiConversationMessagesList(raw: unknown): ConversationMessage[] {
  const inner = unwrapEnvelope(raw);
  if (Array.isArray(inner)) return inner.map(mapApiConversationMessage);
  if (inner && typeof inner === 'object') {
    const o = inner as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data.map(mapApiConversationMessage);
  }
  return [];
}
