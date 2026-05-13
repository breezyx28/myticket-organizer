import { Button } from '@/components/ui/Button';
import {
  archiveEvent,
  canArchiveEventStatus,
  canRemoveEventStatus,
  cancelEvent,
  duplicateEvent,
  listEventsPaged,
  removeEvent,
} from '@/services/eventsService';
import { getProfile, isProfileComplete } from '@/services/profileService';
import { EVENT_STATUS_LABEL } from '@/lib/eventStatusLabels';
import type { OrganizerEvent } from '@/types/domain';
import { MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';

export function EventListPage() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [profileOk, setProfileOk] = useState(true);
  const [page, setPage] = useState(1);
  const [pager, setPager] = useState<{ current: number; last: number; total: number } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: 'archive' | 'delete' | 'cancel';
    eventId: string;
    eventTitle: string;
  } | null>(null);

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

      <div className="rounded-3xl border border-ink-10 bg-white shadow-card-sm">
        <table className="min-w-full text-left text-[13px]">
          <thead className="bg-ink-5/80 text-[11px] font-bold uppercase tracking-wide text-ink-60">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="hidden px-4 py-3 md:table-cell">Date &amp; time</th>
              <th className="hidden px-4 py-3 lg:table-cell">Category</th>
              <th className="hidden px-4 py-3 xl:table-cell">Entry</th>
              <th className="px-4 py-3">Status</th>
              <th className="hidden px-4 py-3 md:table-cell">Sold</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-10">
            {events.map((e) => (
              <tr key={e.id} className="hover:bg-ink-5/40">
                <td className="px-4 py-4">
                  <p className="font-bold text-ink">{e.title}</p>
                  <p className="mt-1 text-[12px] text-ink-60">
                    {e.city || 'Unknown city'} · {layoutLabel(e.layoutType)}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-ink-40">
                    #{e.id}
                  </p>
                </td>
                <td className="hidden px-4 py-4 text-ink-60 md:table-cell">
                  <p className="font-medium text-ink">{new Date(e.startsAt).toLocaleString()}</p>
                  <p className="mt-1 text-[12px] text-ink-50">to {new Date(e.endsAt).toLocaleString()}</p>
                </td>
                <td className="hidden px-4 py-4 lg:table-cell">
                  <span className="inline-flex rounded-full bg-ink-5 px-2.5 py-1 text-[11px] font-semibold text-ink-70">
                    {e.category || 'Uncategorized'}
                  </span>
                </td>
                <td className="hidden px-4 py-4 xl:table-cell">
                  <span className="inline-flex rounded-full bg-sky/20 px-2.5 py-1 text-[11px] font-semibold text-sky-dark">
                    {entryModeLabel(e.entryMode)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase ring-1 ${statusBadgeClass(e.status)}`}>
                    {EVENT_STATUS_LABEL[e.status]}
                  </span>
                </td>
                <td className="hidden px-4 py-4 md:table-cell">
                  <span className="font-mono text-[12px] font-semibold text-ink">{e.ticketsSold}</span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink-10 bg-white text-ink-60 hover:bg-ink-5"
                      onClick={() => setOpenMenuId((cur) => (cur === e.id ? null : e.id))}
                      aria-label="Open actions"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {openMenuId === e.id ? (
                      <div className="absolute right-0 z-[120] mt-2 min-w-[170px] overflow-hidden rounded-xl border border-ink-10 bg-white shadow-card-sm">
                        <Link
                          to={`/events/${e.id}`}
                          className="block px-3 py-2 text-left text-[13px] font-semibold text-ink hover:bg-ink-5"
                          onClick={() => setOpenMenuId(null)}
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[13px] text-ink hover:bg-ink-5"
                          onClick={() => {
                            setOpenMenuId(null);
                            void (async () => {
                              await duplicateEvent(e.id);
                              await reload(page);
                            })();
                          }}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[13px] text-ink hover:bg-ink-5 disabled:cursor-not-allowed disabled:text-ink-40 disabled:hover:bg-white"
                          disabled={e.status === 'cancelled' || e.status === 'archived'}
                          onClick={() => {
                            setOpenMenuId(null);
                            setPendingAction({ type: 'cancel', eventId: e.id, eventTitle: e.title });
                          }}
                          title={e.status === 'cancelled' || e.status === 'archived' ? 'Event is already cancelled or archived' : 'Cancel event'}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[13px] text-ink hover:bg-ink-5 disabled:cursor-not-allowed disabled:text-ink-40 disabled:hover:bg-white"
                          disabled={!canArchiveEventStatus(e.status)}
                          onClick={() => {
                            setOpenMenuId(null);
                            setPendingAction({ type: 'archive', eventId: e.id, eventTitle: e.title });
                          }}
                          title={canArchiveEventStatus(e.status) ? 'Archive event' : 'Archive is allowed only when event status is ended'}
                        >
                          Archive
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[13px] text-coral hover:bg-coral/5 disabled:cursor-not-allowed disabled:text-ink-40 disabled:hover:bg-white"
                          disabled={!canRemoveEventStatus(e.status)}
                          onClick={() => {
                            setOpenMenuId(null);
                            setPendingAction({ type: 'delete', eventId: e.id, eventTitle: e.title });
                          }}
                          title={canRemoveEventStatus(e.status) ? 'Delete event' : 'Delete is allowed only for draft or rejected events'}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
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

      {pendingAction ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-ink/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-ink-10 bg-white p-5 shadow-card-sm">
            <h3 className="text-lg font-extrabold text-ink">
              {pendingAction.type === 'archive'
                ? 'Archive event?'
                : pendingAction.type === 'cancel'
                  ? 'Cancel event?'
                  : 'Delete event?'}
            </h3>
            <p className="mt-2 text-[13px] text-ink-60">
              {pendingAction.type === 'archive'
                ? `Archive "${pendingAction.eventTitle}"? This follows lifecycle transition rules on the server.`
                : pendingAction.type === 'cancel'
                  ? `Cancel "${pendingAction.eventTitle}"? This follows lifecycle transition rules on the server.`
                : `Delete "${pendingAction.eventTitle}" permanently? This is allowed only for draft or rejected events.`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPendingAction(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={pendingAction.type === 'delete' ? 'danger' : 'dark'}
                size="sm"
                onClick={() => {
                  const action = pendingAction;
                  setPendingAction(null);
                  void (async () => {
                    try {
                      if (action.type === 'archive') {
                        await archiveEvent(action.eventId);
                      } else if (action.type === 'cancel') {
                        await cancelEvent(action.eventId);
                      } else {
                        await removeEvent(action.eventId);
                      }
                      await reload(page);
                    } catch {}
                  })();
                }}
              >
                {pendingAction.type === 'archive' ? 'Archive' : pendingAction.type === 'cancel' ? 'Cancel event' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function layoutLabel(layoutType: OrganizerEvent['layoutType']) {
  if (layoutType === 'grid') return 'Grid layout';
  if (layoutType === 'section') return 'Section layout';
  return 'Free layout';
}

function entryModeLabel(entryMode: OrganizerEvent['entryMode']) {
  return entryMode === 'multi_scan' ? 'Multi-scan' : 'One-time entry';
}

function statusBadgeClass(status: OrganizerEvent['status']) {
  switch (status) {
    case 'published':
      return 'bg-mint/20 text-mint-dark ring-mint/40';
    case 'pending_approval':
      return 'bg-lemon/25 text-lemon-dark ring-lemon/40';
    case 'rejected':
      return 'bg-coral/15 text-coral ring-coral/35';
    case 'cancelled':
      return 'bg-coral/10 text-coral ring-coral/30';
    case 'archived':
      return 'bg-ink-10 text-ink-60 ring-ink-20';
    case 'sold_out':
      return 'bg-indigo/15 text-indigo ring-indigo/30';
    case 'in_progress':
      return 'bg-sky/20 text-sky-dark ring-sky/35';
    case 'ended':
      return 'bg-violet/15 text-violet ring-violet/30';
    case 'draft':
    default:
      return 'bg-ink-5 text-ink-80 ring-ink-10';
  }
}
