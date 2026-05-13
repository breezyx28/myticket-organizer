import { Button } from '@/components/ui/Button';
import { duplicateEvent, listEventsPaged } from '@/services/eventsService';
import type { OrganizerEvent } from '@/types/domain';
import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';

export function EventArchivePage() {
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
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Archive</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Archived events</h1>
        <p className="mt-2 max-w-xl text-[15px] text-ink-60">
          Hidden from public discovery — duplicate to spin up the next edition. Pagination follows the main events list; only archived rows on the current page are shown here.
        </p>
      </div>

      {pager ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-10 bg-ink-5/40 px-4 py-3 text-[13px] text-ink-60">
          <span>
            Page <span className="font-mono font-bold text-ink">{pager.current}</span> of{' '}
            <span className="font-mono font-bold text-ink">{pager.last}</span>
            {pager.total > 0 ? (
              <>
                {' '}
                · <span className="font-mono font-bold text-ink">{pager.total}</span> events in account
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
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pager.current >= pager.last}
                onClick={() => setPage((x) => x + 1)}
              >
                Next
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
            <p className="mt-3 text-[12px] text-ink-40">{new Date(e.startsAt).toLocaleDateString()}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/events/${e.id}`}>
                <Button variant="outline" size="sm">
                  Open
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
                Duplicate
              </Button>
            </div>
            {e.postEventMedia.length > 0 ? (
              <ul className="mt-4 space-y-1 text-[12px] text-ink-60">
                {e.postEventMedia.map((m, i) => (
                  <li key={`${m.label}-${i}`}>
                    {m.kind}: {m.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[12px] text-ink-40">No post-event media yet.</p>
            )}
          </article>
        ))}
        {events.length === 0 ? <p className="text-[14px] text-ink-40">No archived events on this page.</p> : null}
      </div>
    </div>
  );
}
