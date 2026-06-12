import type { ConversationMessage } from '@/types/domain';
import type { MessagePayload } from '@/lib/realtime/types';

export type ThreadMessage = ConversationMessage & {
  clientId?: string;
  sendStatus?: 'sending' | 'sent' | 'failed';
  sendError?: string;
};

export function createClientMessageId(): string {
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function payloadToThreadMessage(payload: MessagePayload, conversationId: string): ThreadMessage {
  return {
    id: String(payload.id),
    conversationId,
    senderUserId: String(payload.sender_user_id),
    senderRole: payload.sender_role,
    body: payload.body,
    attachmentUrl: payload.attachment_url ?? undefined,
    createdAt: payload.created_at ?? new Date().toISOString(),
    sendStatus: 'sent',
  };
}

export function createOptimisticMessage(
  conversationId: string,
  body: string,
  senderUserId: string
): ThreadMessage {
  const clientId = createClientMessageId();
  return {
    id: clientId,
    clientId,
    conversationId,
    senderUserId,
    senderRole: 'organizer',
    body,
    createdAt: new Date().toISOString(),
    sendStatus: 'sending',
  };
}

export function mergeIncomingThreadMessage(prev: ThreadMessage[], incoming: ThreadMessage): ThreadMessage[] {
  if (prev.some((m) => m.id === incoming.id && !m.clientId)) return prev;

  const optimisticIdx = prev.findIndex(
    (m) =>
      m.clientId &&
      (m.sendStatus === 'sending' || m.sendStatus === 'failed') &&
      m.body === incoming.body &&
      m.senderRole === incoming.senderRole
  );

  if (optimisticIdx >= 0) {
    const next = [...prev];
    next[optimisticIdx] = {
      ...incoming,
      clientId: prev[optimisticIdx]!.clientId,
      sendStatus: 'sent',
      sendError: undefined,
    };
    return next;
  }

  if (prev.some((m) => m.id === incoming.id)) return prev;
  return [...prev, incoming];
}

export function markMessageFailed(prev: ThreadMessage[], clientId: string, error: string): ThreadMessage[] {
  return prev.map((m) =>
    m.clientId === clientId ? { ...m, sendStatus: 'failed' as const, sendError: error } : m
  );
}

export function markMessageSending(prev: ThreadMessage[], clientId: string): ThreadMessage[] {
  return prev.map((m) =>
    m.clientId === clientId ? { ...m, sendStatus: 'sending' as const, sendError: undefined } : m
  );
}

export function confirmSentMessage(prev: ThreadMessage[], clientId: string, server: ConversationMessage): ThreadMessage[] {
  return prev.map((m) =>
    m.clientId === clientId
      ? {
          ...server,
          clientId,
          sendStatus: 'sent' as const,
          sendError: undefined,
        }
      : m
  );
}

export function serverMessagesToThread(messages: ConversationMessage[]): ThreadMessage[] {
  return messages.map((m) => ({ ...m, sendStatus: 'sent' as const }));
}
