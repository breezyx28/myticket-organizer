import { useRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { emitThreadMessage } from '@/lib/realtime/messageBus';
import { getActiveConversationId } from '@/lib/realtime/channels';
import { organizerApi } from '@/store/api/organizerApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useEffect, type ReactNode } from 'react';

function parseUserId(id: string | undefined): number | null {
  if (!id) return null;
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.accessToken);
  const { user } = useAuth();

  useEffect(() => {
    if (!token || user?.id) return;
    void dispatch(organizerApi.endpoints.getProfile.initiate());
  }, [dispatch, token, user?.id]);

  const userId = parseUserId(user?.id);

  useRealtime({
    token,
    userId,
    handlers: {
      onNotification: () => {
        dispatch(organizerApi.util.invalidateTags(['Notification']));
      },
      onMessageInbox: (payload) => {
        emitThreadMessage(payload);
        dispatch(
          organizerApi.util.invalidateTags([
            { type: 'Conversation', id: String(payload.conversation_id) },
            { type: 'ConversationMessage', id: String(payload.conversation_id) },
            { type: 'Conversation', id: 'LIST' },
            { type: 'ConversationUnread', id: 'COUNT' },
          ])
        );
        if (getActiveConversationId() !== payload.conversation_id) {
          dispatch(organizerApi.util.invalidateTags(['ConversationUnread']));
        }
      },
      onEngagementStatus: () => {
        dispatch(organizerApi.util.invalidateTags(['Conversation', 'Engagement']));
      },
    },
  });

  return children;
}
