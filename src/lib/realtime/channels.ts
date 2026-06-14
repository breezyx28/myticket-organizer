import type { MessagePayload, ScanBatchPayload, ScanLiveStatsPayload } from '@/lib/realtime/types';
import type { RealtimeEnvelope } from '@/lib/realtime/types';
import { getEcho, whenEchoReady } from '@/lib/realtime/echo';
import { echoChannelFromApi } from '@/lib/api/mapScanLive';

export type EventScanHandlers = {
  onBatch?: (payload: ScanBatchPayload) => void;
  onStats?: (payload: ScanLiveStatsPayload) => void;
};

let subscribedUserId: number | null = null;
let activeConversationId: number | null = null;
let activeConversationHandler: ((payload: MessagePayload) => void) | null = null;
let activeEventScanId: number | null = null;
let activeEventScanChannel: string | null = null;
let activeEventScanHandlers: EventScanHandlers | null = null;

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

function bindEventScanChannel(channelName: string, handlers: EventScanHandlers): void {
  const echo = getEcho();
  if (!echo) return;
  const channel = echo.private(channelName);
  if (handlers.onBatch) {
    channel.listen('.scan.batch_recorded', (envelope: RealtimeEnvelope<ScanBatchPayload>) => {
      handlers.onBatch?.(envelope.payload);
    });
  }
  if (handlers.onStats) {
    channel.listen('.scan.stats_updated', (envelope: RealtimeEnvelope<ScanLiveStatsPayload>) => {
      handlers.onStats?.(envelope.payload);
    });
  }
}

function resubscribeEventScans(): void {
  if (!activeEventScanChannel || !activeEventScanHandlers) return;
  bindEventScanChannel(activeEventScanChannel, activeEventScanHandlers);
}

export type RealtimeHandlers = {
  onNotification?: (payload: import('@/lib/realtime/types').NotificationPayload) => void;
  onEngagementStatus?: (payload: Record<string, unknown>) => void;
  onMessageInbox?: (payload: MessagePayload) => void;
};

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

export function subscribeEventScans(
  eventId: number,
  handlers: EventScanHandlers,
  channelFromApi?: string
): () => void {
  leaveEventScans();
  activeEventScanId = eventId;
  activeEventScanHandlers = handlers;
  activeEventScanChannel = echoChannelFromApi(channelFromApi ?? '', String(eventId));

  const attach = () => {
    if (!activeEventScanHandlers || !activeEventScanChannel) return;
    bindEventScanChannel(activeEventScanChannel, activeEventScanHandlers);
  };
  if (getEcho()) attach();
  const offReady = whenEchoReady(attach);

  return () => {
    offReady();
    if (activeEventScanId === eventId) leaveEventScans();
  };
}

export function leaveEventScans(): void {
  if (activeEventScanChannel !== null) {
    getEcho()?.leave(activeEventScanChannel);
    activeEventScanId = null;
    activeEventScanChannel = null;
    activeEventScanHandlers = null;
  }
}

export function getActiveEventScanId(): number | null {
  return activeEventScanId;
}

/** Re-bind conversation channel after Echo reconnects (called from useRealtime). */
export function resubscribeActiveRealtimeChannels(userId: number, handlers: RealtimeHandlers): void {
  subscribeUserChannel(userId, handlers);
  resubscribeConversation();
  resubscribeEventScans();
}

export function resetRealtimeChannelState(): void {
  subscribedUserId = null;
  activeConversationId = null;
  activeConversationHandler = null;
  activeEventScanId = null;
  activeEventScanChannel = null;
  activeEventScanHandlers = null;
}
