import { Button } from '@/components/ui/Button';
import { listConversations } from '@/services/conversationsService';
import { organizerApi } from '@/store/api/organizerApi';
import type { Conversation } from '@/types/domain';
import { cn } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { formatDateTime } from '@/lib/locale/format';

function counterpartName(c: Conversation, fallback: string): string {
  const other = c.participants.find((p) => p.role !== 'organizer');
  return other?.displayName || other?.email || fallback;
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

function statusLabel(c: Conversation, t: TranslateFn): string {
  return c.status === 'closed' ? t('status.closed') : t('status.open');
}

export function EngagementsPage() {
  const { t } = useTranslation(['engagements', 'common']);
  const { language } = useLocale();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: unread } = organizerApi.useGetConversationsUnreadCountQuery();

  async function reload() {
    setLoading(true);
    try {
      const page = await listConversations(1);
      setRows(page.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(t);
  }, [conversationId]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">{t('page.eyebrow')}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t('page.title')}</h1>
          <p className="mt-2 max-w-xl text-[15px] text-ink-60">{t('page.description')}</p>
        </div>
        {(unread?.unread_count ?? 0) > 0 ? (
          <span className="inline-flex w-fit rounded-full bg-coral/15 px-3 py-1.5 text-[12px] font-bold text-coral">
            {t('page.unread', { count: unread!.unread_count })}
          </span>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <section className="overflow-hidden rounded-3xl border border-ink-10 bg-white shadow-card-sm">
          <div className="border-b border-ink-10 px-4 py-3">
            <p className="text-[12px] font-bold uppercase tracking-wide text-ink-50">{t('inbox.requests')}</p>
          </div>
          {loading ? (
            <p className="px-4 py-8 text-[13px] text-ink-50">{t('loading', { ns: 'common' })}</p>
          ) : rows.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-ink-30" strokeWidth={1.5} aria-hidden />
              <p className="mt-3 text-[14px] font-semibold text-ink">{t('inbox.emptyTitle')}</p>
              <p className="mt-1 text-[13px] text-ink-50">{t('inbox.emptyBody')}</p>
              <Link to="/events" className="mt-4 inline-block">
                <Button variant="dark" size="sm">
                  {t('inbox.goToEvents')}
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-ink-10">
              {rows.map((c) => {
                const active = conversationId === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/engagements/${c.id}`)}
                      className={cn(
                        'w-full px-4 py-3.5 text-start transition hover:bg-ink-5/40',
                        active && 'bg-ink-5/60'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[14px] font-bold text-ink">{c.subject}</p>
                        {c.unread ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-coral" aria-hidden /> : null}
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-ink-60">{counterpartName(c, t('counterpart.partner'))}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-40">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-semibold uppercase',
                            c.status === 'open' ? 'bg-mint/25 text-ink' : 'bg-ink-10 text-ink-50'
                          )}
                        >
                          {statusLabel(c, t as TranslateFn)}
                        </span>
                        {c.lastMessageAt ? <span>{formatDateTime(c.lastMessageAt, language)}</span> : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="min-h-[420px] rounded-3xl border border-ink-10 bg-white shadow-card-sm">
          {conversationId ? (
            <Outlet />
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-center text-[14px] text-ink-50">
              {t('inbox.selectPrompt')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
