import { describe, expect, it } from 'vitest';
import {
  confirmSentMessage,
  createOptimisticMessage,
  markMessageFailed,
  mergeIncomingThreadMessage,
  payloadToThreadMessage,
} from '@/lib/chat/threadMessages';

describe('threadMessages', () => {
  it('creates optimistic message with sending status', () => {
    const m = createOptimisticMessage('42', 'Hi', '10');
    expect(m.sendStatus).toBe('sending');
    expect(m.clientId).toBeTruthy();
    expect(m.body).toBe('Hi');
  });

  it('merges websocket payload into optimistic row', () => {
    const optimistic = createOptimisticMessage('42', 'Hi', '10');
    const incoming = payloadToThreadMessage(
      {
        id: 99,
        conversation_id: 42,
        sender_user_id: 10,
        sender_role: 'organizer',
        body: 'Hi',
        attachment_url: null,
        created_at: '2026-06-13T12:00:00Z',
      },
      '42'
    );
    const merged = mergeIncomingThreadMessage([optimistic], incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe('99');
    expect(merged[0]?.sendStatus).toBe('sent');
  });

  it('marks failed and confirms sent', () => {
    const optimistic = createOptimisticMessage('42', 'Hi', '10');
    const failed = markMessageFailed([optimistic], optimistic.clientId!, 'Network error');
    expect(failed[0]?.sendStatus).toBe('failed');
    expect(failed[0]?.sendError).toBe('Network error');

    const confirmed = confirmSentMessage(failed, optimistic.clientId!, {
      id: '5',
      conversationId: '42',
      senderUserId: '10',
      senderRole: 'organizer',
      body: 'Hi',
      createdAt: '2026-06-13T12:00:00Z',
    });
    expect(confirmed[0]?.id).toBe('5');
    expect(confirmed[0]?.sendStatus).toBe('sent');
  });
});
