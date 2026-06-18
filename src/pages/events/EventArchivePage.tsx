import { Button } from '@/components/ui/Button';
import { duplicateEvent, listEventsPaged } from '@/services/eventsService';
import type { OrganizerEvent } from '@/types/domain';
import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { postEventMediaKindLabel } from '@/lib/events/mediaLabels';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { formatDate } from '@/lib/locale/format';

export function EventArchivePage() {
  const { t } = useTranslation('events');
  const { language } = useLocale();
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [pager, setPager] = useState<{ current: number; last: number; total: number } | null>(null);

  const load = useCallback(
    async (forPage = page) => {
      const shell = await listEventsPaged(forPage);
      setPager({ current: shell.current_page, last: shell.last_page, total: shell.total });
      setEvents(shell.data.filter((e) => e.status === 'archived'));
    },
    [page]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">{t('archive.eyebrow')}</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t('archive.title')}</h1>
        <p className="mt-2 max-w-xl text-[15px] text-ink-60">{t('archive.description')}</p>
      </div>

      {pager ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-10 bg-ink-5/40 px-4 py-3 text-[13px] text-ink-60">
          <span>
            {t('list.pagination.pageOf', { current: pager.current, last: pager.last })}
            {pager.total > 0 ? (
              <>
                {' '}
                · {t('list.pagination.eventsTotal', { total: pager.total })}
              </>
            ) : null}
          </span>
          {pager.last > 1 ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pager.current <= 1}
                onClick={() => setPage((x) => Math.max(1, x - 1))}
              >
                {t('list.pagination.previous')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pager.current >= pager.last}
                onClick={() => setPage((x) => x + 1)}
              >
                {t('list.pagination.next')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {events.map((e) => (
          <article key={e.id} className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
            <h2 className="text-lg font-extrabold text-ink">{e.title}</h2>
            <p className="mt-1 text-[13px] text-ink-60">
              {e.venue}, {e.city}
            </p>
            <p className="mt-3 text-[12px] text-ink-40">{formatDate(e.startsAt, language)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/events/${e.id}`}>
                <Button variant="outline" size="sm">
                  {t('list.actions.edit')}
                </Button>
              </Link>
              <Button
                variant="dark"
                size="sm"
                onClick={() => {
                  void (async () => {
                    await duplicateEvent(e.id);
                    await load();
                  })();
                }}
              >
                {t('list.actions.duplicate')}
              </Button>
            </div>
            {e.postEventMedia.length > 0 ? (
              <ul className="mt-4 space-y-1 text-[12px] text-ink-60">
                {e.postEventMedia.map((m, i) => (
                  <li key={`${m.label}-${i}`}>
                    {postEventMediaKindLabel(m.kind)}: {m.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
        {events.length === 0 ? <p className="text-[14px] text-ink-40">{t('list.empty')}</p> : null}
      </div>
    </div>
  );
}
