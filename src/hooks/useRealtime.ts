import { useEffect, useRef } from 'react';
import { connectEcho, disconnectEcho } from '@/lib/realtime/echo';
import { resubscribeActiveRealtimeChannels, resetRealtimeChannelState, type RealtimeHandlers } from '@/lib/realtime/channels';

type Options = {
  token: string | null;
  userId: number | null;
  handlers: RealtimeHandlers;
};

export function useRealtime({ token, userId, handlers }: Options): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!token || userId == null) {
      disconnectEcho();
      resetRealtimeChannelState();
      return;
    }

    connectEcho(token);
    resubscribeActiveRealtimeChannels(userId, {
      onNotification: (p) => handlersRef.current.onNotification?.(p),
      onEngagementStatus: (p) => handlersRef.current.onEngagementStatus?.(p),
      onMessageInbox: (p) => handlersRef.current.onMessageInbox?.(p),
    });

    return () => {
      disconnectEcho();
      resetRealtimeChannelState();
    };
  }, [token, userId]);
}
