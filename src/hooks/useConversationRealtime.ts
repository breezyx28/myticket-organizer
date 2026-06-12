import { useEffect } from 'react';
import { subscribeConversation } from '@/lib/realtime/channels';
import { emitThreadMessage, subscribeThreadMessages } from '@/lib/realtime/messageBus';
import type { MessagePayload } from '@/lib/realtime/types';

/**
 * Delivers `.message.sent` from the conversation channel and from the user inbox channel
 * (RealtimeProvider forwards inbox events into the message bus).
 */
export function useConversationRealtime(
  conversationId: string | undefined,
  onMessage: (payload: MessagePayload) => void
): void {
  useEffect(() => {
    if (!conversationId) return;
    const cid = Number(conversationId);
    if (!Number.isFinite(cid) || cid <= 0) return;

    const offBus = subscribeThreadMessages(cid, onMessage);
    const offChannel = subscribeConversation(cid, emitThreadMessage);

    return () => {
      offBus();
      offChannel();
    };
  }, [conversationId, onMessage]);
}
