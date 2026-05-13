import { Button } from '@/components/ui/Button';
import {
  archiveEvent,
  duplicateEvent,
  listEventsPaged,
  simulateLifecycleTick,
} from '@/services/eventsService';
import { getProfile, isProfileComplete } from '@/services/profileService';
import { EVENT_STATUS_LABEL } from '@/lib/eventStatusLabels';
import type { OrganizerEvent } from '@/types/domain';
import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';

export function EventListPage() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [profileOk, setProfileOk] = useState(true);
  const [page, setPage] = useState(1);
  const [pager, setPager] = useState<{ current: number; last: number; total: number } | null>(null);

  const reload = useCallback(
    async (forPage = page) => {
      const [evPage, p] = await Promise.all([listEventsPaged(forPage), getProfile()]);
      setEvents(evPage.data);
      setPager({ current: evPage.current_page, last: evPage.last_page, total: evPage.total });
      setProfileOk(isProfileComplete(p));
    },
    [page]
  );

  useEffect(() => {
    const t = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(t);
  }, [reload]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Events</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">My events</h1>
          <p className="mt-2 max-w-xl text-[15px] text-ink-60">Create, publish, edit, duplicate, cancel, and archive against the organizer API.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={profileOk ? '/events/new' : '/profile'}>
            <Button variant="primary" size="md">
              {profileOk ? 'Create event' : 'Complete profile first'}
            </Button>
          </Link>
          <Link to="/events/archive">
            <Button variant="outline" size="md">
              Archive
            </Button>
          </Link>
        </div>
      </div>

      {!profileOk ? (
        <div className="rounded-3xl border border-coral/40 bg-coral/10 px-5 py-4 text-[14px] text-ink">
          <strong>Profile incomplete.</strong> Finish your organizer profile before creating events.{' '}
          <Link to="/profile" className="font-semibold text-coral underline">
            Open profile
          </Link>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-ink-10 bg-white shadow-card-sm">
        <table className="min-w-full text-left text-[13px]">
          <thead className="bg-ink-5/80 text-[11px] font-bold uppercase tracking-wide text-ink-60">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="hidden px-4 py-3 md:table-cell">When</th>
              <th className="px-4 py-3">Status</th>
              <th className="hidden px-4 py-3 lg:table-cell">Sold</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-10">
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-ink-5/40">
                <td className="px-4 py-4">
                  <p className="font-bold text-ink">{e.title}</p>
                  <p className="text-[12px] text-ink-60">
                    {e.city} · {e.layoutType.toUpperCase()}
                  </p>
                </td>
                <td className="hidden px-4 py-4 text-ink-60 md:table-cell">{new Date(e.startsAt).toLocaleString()}</td>
                <td className="px-4 py-4">
                  <span className="inline-flex rounded-full bg-ink-5 px-3 py-1 text-[11px] font-bold uppercase text-ink-80 ring-1 ring-ink-10">
                    {EVENT_STATUS_LABEL[e.status]}
                  </span>
                </td>
                <td className="hidden px-4 py-4 font-mono lg:table-cell">{e.ticketsSold}</td>
                <td className="px-4 py-4 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link to={`/events/${e.id}`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    {e.status === 'ended' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void (async () => {
                            await archiveEvent(e.id);
                            await reload();
                          })();
                        }}
                      >
                        Archive
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void (async () => {
                          await duplicateEvent(e.id);
                          await reload();
                        })();
                      }}
                    >
                      Duplicate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void (async () => {
                          await simulateLifecycleTick(e.id);
                          await reload();
                        })();
                      }}
                    >
                      Next state
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 ? <p className="p-6 text-[14px] text-ink-40">No events on this page.</p> : null}
      </div>

      {pager ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-10 bg-ink-5/40 px-4 py-3 text-[13px] text-ink-60">
          <span>
            Page <span className="font-mono font-bold text-ink">{pager.current}</span> of{' '}
            <span className="font-mono font-bold text-ink">{pager.last}</span>
            {pager.total > 0 ? (
              <>
                {' '}
                · <span className="font-mono font-bold text-ink">{pager.total}</span> events total
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
    </div>
  );
}
