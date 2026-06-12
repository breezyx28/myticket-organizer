import { organizerApi } from '@/store/api/organizerApi';
import type { Conversation, ConversationMessage, ConversationsListPage } from '@/types/domain';
import { apiDispatch, apiUnwrap } from '@/services/apiDispatch';

export type CreateConversationInput = {
  targetType: 'talent' | 'vendor';
  targetId: string;
  topic?: string;
  brief?: string;
  eventId?: string;
};

export async function getConversationsUnreadCount(): Promise<number> {
  const res = await apiUnwrap<{ unread_count: number }>(
    apiDispatch(organizerApi.endpoints.getConversationsUnreadCount.initiate())
  );
  return res.unread_count;
}

export async function listConversations(page = 1): Promise<ConversationsListPage> {
  return apiUnwrap<ConversationsListPage>(
    apiDispatch(organizerApi.endpoints.listConversations.initiate({ page, per_page: 20, type: 'marketplace' }))
  );
}

export async function getConversation(id: string): Promise<Conversation> {
  return apiUnwrap<Conversation>(apiDispatch(organizerApi.endpoints.getConversation.initiate(id)));
}

export async function createConversation(input: CreateConversationInput): Promise<Conversation> {
  const target_id = Number(input.targetId);
  const event_id = input.eventId ? Number(input.eventId) : undefined;
  return apiUnwrap<Conversation>(
    apiDispatch(
      organizerApi.endpoints.createConversation.initiate({
        target_type: input.targetType,
        target_id,
        ...(input.topic ? { topic: input.topic } : {}),
        ...(input.brief ? { brief: input.brief } : {}),
        ...(event_id != null && !Number.isNaN(event_id) && event_id > 0 ? { event_id } : {}),
      })
    )
  );
}

export async function listConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
  return apiUnwrap<ConversationMessage[]>(
    apiDispatch(organizerApi.endpoints.listConversationMessages.initiate(conversationId))
  );
}

export async function postConversationMessage(conversationId: string, body: string): Promise<ConversationMessage> {
  return apiUnwrap<ConversationMessage>(
    apiDispatch(organizerApi.endpoints.postConversationMessage.initiate({ conversationId, body }))
  );
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await apiUnwrap(apiDispatch(organizerApi.endpoints.markConversationRead.initiate(conversationId)));
}
