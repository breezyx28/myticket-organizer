import { Button } from '@/components/ui/Button';
import { useConversationRealtime } from '@/hooks/useConversationRealtime';
import { organizerApi } from '@/store/api/organizerApi';
import {
  confirmSentMessage,
  createOptimisticMessage,
  markMessageFailed,
  markMessageSending,
  mergeIncomingThreadMessage,
  payloadToThreadMessage,
  serverMessagesToThread,
  type ThreadMessage,
} from '@/lib/chat/threadMessages';
import {
  getConversation,
  listConversationMessages,
  markConversationRead,
  postConversationMessage,
} from '@/services/conversationsService';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import { toast } from '@/lib/appToast';
import type { Conversation } from '@/types/domain';
import type { MessagePayload } from '@/lib/realtime/types';
import { cn } from '@/lib/utils';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiDispatch, apiUnwrap } from '@/services/apiDispatch';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { formatDateTime } from '@/lib/locale/format';

function counterpartName(c: Conversation, fallback: string): string {
  const other = c.participants.find((p) => p.role !== 'organizer');
  return other?.displayName || other?.email || fallback;
}

function EngagementMessageBubble({
  message,
  onRetry,
  sendingLabel,
  retryLabel,
  notDeliveredLabel,
  locale,
}: {
  message: ThreadMessage;
  onRetry?: () => void;
  sendingLabel: string;
  retryLabel: string;
  notDeliveredLabel: string;
  locale: 'en' | 'ar';
}) {
  const mine = message.senderRole === 'organizer';
  const failed = message.sendStatus === 'failed';
  const sending = message.sendStatus === 'sending';

  return (
    <li className={cn('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] transition-opacity',
          mine ? 'bg-ink text-white' : 'bg-ink-5 text-ink',
          sending && 'opacity-80',
          failed && mine && 'bg-coral/90'
        )}
      >
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p className={cn('mt-1 text-[10px]', mine ? 'text-white/60' : 'text-ink-40')}>
          {sending ? sendingLabel : formatDateTime(message.createdAt, locale)}
        </p>
      </div>
      {failed && mine ? (
        <div className="flex max-w-[85%] items-center gap-2 text-[11px] text-coral">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="min-w-0 truncate">{message.sendError || notDeliveredLabel}</span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex shrink-0 items-center gap-1 font-semibold underline-offset-2 hover:underline active:scale-[0.98]"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={2} aria-hidden />
              {retryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function EngagementThreadPanel({
  conversationId,
  onBack,
}: {
  conversationId: string;
  onBack?: () => void;
}) {
  const { t } = useTranslation(['engagements', 'common']);
  const { language } = useLocale();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function reload(options?: { silent?: boolean }) {
    const [c, m] = await Promise.all([
      getConversation(conversationId),
      listConversationMessages(conversationId),
    ]);
    setConversation(c);
    setMessages((prev) => {
      const server = serverMessagesToThread(m);
      const pending = prev.filter((x) => x.clientId && x.sendStatus !== 'sent');
      return [...server, ...pending.filter((p) => !server.some((s) => s.body === p.body && s.senderRole === p.senderRole))];
    });
    await markConversationRead(conversationId);
    if (!options?.silent) setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        await reload();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const handleIncoming = useCallback(
    (payload: MessagePayload) => {
      if (String(payload.conversation_id) !== conversationId) return;
      const incoming = payloadToThreadMessage(payload, conversationId);
      setMessages((prev) => mergeIncomingThreadMessage(prev, incoming));
      void markConversationRead(conversationId);
    },
    [conversationId]
  );

  useConversationRealtime(conversationId, handleIncoming);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.sendStatus]);

  const sendMessage = useCallback(
    async (body: string, existingClientId?: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      let clientId = existingClientId;
      if (!clientId) {
        const optimistic = createOptimisticMessage(conversationId, trimmed, user?.id ?? '0');
        clientId = optimistic.clientId!;
        setMessages((prev) => [...prev, optimistic]);
      } else {
        setMessages((prev) => markMessageSending(prev, clientId!));
      }

      try {
        const msg = await postConversationMessage(conversationId, trimmed);
        setMessages((prev) => confirmSentMessage(prev, clientId!, msg));
      } catch (err) {
        const errorText = formatOrganizerApiError(err);
        setMessages((prev) => markMessageFailed(prev, clientId!, errorText));
      }
    },
    [conversationId, user?.id]
  );

  function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    void sendMessage(body);
  }

  async function handleCancelEngagement() {
    if (!conversation?.contextId) return;
    if (!window.confirm(t('thread.cancelConfirm'))) return;
    try {
      await apiUnwrap(
        apiDispatch(organizerApi.endpoints.cancelEngagement.initiate(conversation.contextId))
      );
      toast.success(t('thread.cancelSuccess'));
      await reload({ silent: true });
    } catch (err) {
      toast.error(formatOrganizerApiError(err));
    }
  }

  if (loading) {
    return <p className="p-6 text-[14px] text-ink-50">{t('loading', { ns: 'common' })}</p>;
  }

  if (!conversation) {
    return <p className="p-6 text-[14px] text-ink-50">{t('thread.loadFailed')}</p>;
  }

  const eventId = conversation.metadata?.eventId;

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="border-b border-ink-10 px-5 py-4">
        {onBack ? (
          <button type="button" className="mb-2 text-[12px] font-semibold text-coral hover:underline" onClick={onBack}>
            {t('thread.backToInbox')}
          </button>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-ink">{conversation.subject}</h2>
            <p className="mt-0.5 text-[13px] text-ink-60">{t('thread.withCounterpart', { name: counterpartName(conversation, t('counterpart.partner')) })}</p>
            {eventId ? (
              <Link to={`/events/${eventId}`} className="mt-1 inline-block text-[12px] font-semibold text-coral hover:underline">
                {t('thread.viewLinkedEvent')}
              </Link>
            ) : null}
          </div>
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase',
              conversation.status === 'open' ? 'bg-mint/25 text-ink' : 'bg-ink-10 text-ink-50'
            )}
          >
            {conversation.status === 'open' ? t('status.open') : t('status.closed')}
          </span>
        </div>
        {conversation.status === 'open' && conversation.contextId ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 border-coral/30 text-coral hover:bg-coral/10"
            onClick={() => void handleCancelEngagement()}
          >
            {t('thread.cancelRequest')}
          </Button>
        ) : null}
      </div>

      <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((m) => (
          <EngagementMessageBubble
            key={m.clientId ?? m.id}
            message={m}
            sendingLabel={t('sending', { ns: 'common' })}
            retryLabel={t('retry', { ns: 'common' })}
            notDeliveredLabel={t('thread.notDelivered')}
            locale={language}
            onRetry={
              m.sendStatus === 'failed' && m.clientId
                ? () => void sendMessage(m.body, m.clientId)
                : undefined
            }
          />
        ))}
        {messages.length === 0 ? (
          <li className="text-center text-[13px] text-ink-40">{t('thread.emptyMessages')}</li>
        ) : null}
        <div ref={bottomRef} />
      </ul>

      {conversation.status === 'open' ? (
        <div className="border-t border-ink-10 p-4">
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-ink-10 px-3 py-2.5 text-[14px] outline-none focus:border-ink-30 focus:ring-2 focus:ring-ink/10"
              value={draft}
              placeholder={t('thread.messagePlaceholder')}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button type="button" variant="dark" size="md" disabled={!draft.trim()} onClick={handleSend}>
              {t('thread.send')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="border-t border-ink-10 px-5 py-4 text-[13px] text-ink-50">{t('thread.closedHint')}</p>
      )}
    </div>
  );
}
