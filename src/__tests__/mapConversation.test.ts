import { describe, expect, it } from 'vitest';
import {
  mapApiConversation,
  mapApiConversationMessage,
  mapApiConversationsList,
} from '@/lib/api/mapConversation';

describe('mapConversation', () => {
  it('maps conversation envelope with participants and metadata', () => {
    const conv = mapApiConversation({
      data: {
        id: 42,
        type: 'marketplace',
        subject: 'DJ for Summer Night',
        status: 'open',
        context_type: 'engagement',
        context_id: 9,
        metadata: {
          target_type: 'talent',
          target_id: 15,
          brief: 'Need a DJ',
          event_id: 3,
        },
        last_message_at: '2026-05-01T12:00:00Z',
        created_at: '2026-04-30T10:00:00Z',
        updated_at: '2026-05-01T12:00:00Z',
        unread: true,
        participants: [
          {
            id: 1,
            user_id: 10,
            role: 'organizer',
            user: { full_name: 'Org User', email: 'org@example.com' },
          },
          {
            id: 2,
            user_id: 20,
            role: 'talent',
            user: { full_name: 'DJ Sam', email: 'sam@example.com' },
          },
        ],
      },
    });

    expect(conv.id).toBe('42');
    expect(conv.subject).toBe('DJ for Summer Night');
    expect(conv.status).toBe('open');
    expect(conv.contextType).toBe('engagement');
    expect(conv.contextId).toBe('9');
    expect(conv.metadata).toEqual({
      targetType: 'talent',
      targetId: '15',
      brief: 'Need a DJ',
      eventId: '3',
    });
    expect(conv.unread).toBe(true);
    expect(conv.participants).toHaveLength(2);
    expect(conv.participants[1]?.displayName).toBe('DJ Sam');
  });

  it('maps paginated conversation list', () => {
    const rows = mapApiConversationsList({
      data: [{ id: 1, subject: 'A', status: 'closed' }, { id: 2, topic: 'B', status: 'open' }],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.status).toBe('closed');
    expect(rows[1]?.subject).toBe('B');
  });

  it('maps message payload', () => {
    const msg = mapApiConversationMessage({
      id: 99,
      conversation_id: 42,
      sender_user_id: 10,
      sender_role: 'organizer',
      body: 'Hello there',
      created_at: '2026-05-01T12:05:00Z',
    });
    expect(msg.id).toBe('99');
    expect(msg.conversationId).toBe('42');
    expect(msg.senderRole).toBe('organizer');
    expect(msg.body).toBe('Hello there');
  });
});
