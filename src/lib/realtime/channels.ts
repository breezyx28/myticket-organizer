import type { MessagePayload } from '@/lib/realtime/types';
import type { RealtimeEnvelope } from '@/lib/realtime/types';
import { getEcho, whenEchoReady } from '@/lib/realtime/echo';

export type RealtimeHandlers = {
  onNotification?: (payload: import('@/lib/realtime/types').NotificationPayload) => void;
  onEngagementStatus?: (payload: Record<string, unknown>) => void;
  onMessageInbox?: (payload: MessagePayload) => void;
};

let subscribedUserId: number | null = null;
let activeConversationId: number | null = null;
let activeConversationHandler: ((payload: MessagePayload) => void) | null = null;

function bindConversationChannel(conversationId: number, onMessage: (payload: MessagePayload) => void): void {
  const echo = getEcho();
  if (!echo) return;
  echo
    .private(`conversation.${conversationId}`)
    .listen('.message.sent', (envelope: RealtimeEnvelope<MessagePayload>) => {
      onMessage(envelope.payload);
    });
}

function resubscribeConversation(): void {
  if (activeConversationId == null || !activeConversationHandler) return;
  bindConversationChannel(activeConversationId, activeConversationHandler);
}

export function subscribeUserChannel(userId: number, handlers: RealtimeHandlers): void {
  const echo = getEcho();
  if (!echo) return;

  if (subscribedUserId !== null && subscribedUserId !== userId) {
    echo.leave(`user.${subscribedUserId}`);
  }
  subscribedUserId = userId;

  const channel = echo.private(`user.${userId}`);

  if (handlers.onNotification) {
    channel.listen('.notification.created', (envelope: RealtimeEnvelope) => {
      handlers.onNotification?.(envelope.payload as import('@/lib/realtime/types').NotificationPayload);
    });
  }
  if (handlers.onEngagementStatus) {
    channel.listen('.engagement.status_changed', (envelope: RealtimeEnvelope) => {
      handlers.onEngagementStatus?.(envelope.payload);
    });
  }
  if (handlers.onMessageInbox) {
    channel.listen('.message.sent', (envelope: RealtimeEnvelope<MessagePayload>) => {
      handlers.onMessageInbox?.(envelope.payload);
    });
  }
}

export function subscribeConversation(conversationId: number, onMessage: (payload: MessagePayload) => void): () => void {
  leaveConversation();
  activeConversationId = conversationId;
  activeConversationHandler = onMessage;

  const attach = () => bindConversationChannel(conversationId, onMessage);
  if (getEcho()) {
    attach();
  }
  const offReady = whenEchoReady(attach);

  return () => {
    offReady();
    if (activeConversationId === conversationId) {
      leaveConversation();
    }
  };
}

export function leaveConversation(): void {
  if (activeConversationId !== null) {
    getEcho()?.leave(`conversation.${activeConversationId}`);
    activeConversationId = null;
    activeConversationHandler = null;
  }
}

export function getActiveConversationId(): number | null {
  return activeConversationId;
}

/** Re-bind conversation channel after Echo reconnects (called from useRealtime). */
export function resubscribeActiveRealtimeChannels(userId: number, handlers: RealtimeHandlers): void {
  subscribeUserChannel(userId, handlers);
  resubscribeConversation();
}

export function resetRealtimeChannelState(): void {
  subscribedUserId = null;
  activeConversationId = null;
  activeConversationHandler = null;
}
