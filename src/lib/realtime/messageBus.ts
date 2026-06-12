import type { MessagePayload } from '@/lib/realtime/types';

type MessageListener = (payload: MessagePayload) => void;

const listenersByConversation = new Map<number, Set<MessageListener>>();

export function subscribeThreadMessages(conversationId: number, listener: MessageListener): () => void {
  let set = listenersByConversation.get(conversationId);
  if (!set) {
    set = new Set();
    listenersByConversation.set(conversationId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set?.size === 0) listenersByConversation.delete(conversationId);
  };
}

export function emitThreadMessage(payload: MessagePayload): void {
  const set = listenersByConversation.get(payload.conversation_id);
  if (!set) return;
  for (const listener of set) {
    listener(payload);
  }
}

export function getActiveThreadListenerCount(conversationId: number): number {
  return listenersByConversation.get(conversationId)?.size ?? 0;
}
