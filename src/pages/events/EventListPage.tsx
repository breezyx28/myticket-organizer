import { Button } from '@/components/ui/Button';
import { archiveEvent, duplicateEvent, listEvents, setEventStatus, simulateLifecycleTick } from '@/services/eventsService';
import { getProfile, isProfileComplete } from '@/services/profileService';
import type { EventStatus, OrganizerEvent } from '@/types/domain';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  sold_out: 'Sold out',
  in_progress: 'In progress',
  ended: 'Ended',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

export function EventListPage() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [profileOk, setProfileOk] = useState(true);

  async function reload() {
    const [ev, p] = await Promise.all([listEvents(), getProfile()]);
    setEvents(ev);
    setProfileOk(isProfileComplete(p));
  }

  useEffect(() => {
    const t = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Events</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">My events</h1>
          <p className="mt-2 max-w-xl text-[15px] text-ink-60">Create, publish, edit, duplicate, cancel, and archive — all mock-persisted locally.</p>
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
                    {STATUS_LABEL[e.status]}
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
                          archiveEvent(e.id);
                          void reload();
                        }}
                      >
                        Archive
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        duplicateEvent(e.id);
                        void reload();
                      }}
                    >
                      Duplicate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        simulateLifecycleTick(e.id);
                        void reload();
                      }}
                    >
                      Next state
                    </Button>
                    {e.status !== 'sold_out' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEventStatus(e.id, 'sold_out');
                          void reload();
                        }}
                      >
                        Mark sold out
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 ? <p className="p-6 text-[14px] text-ink-40">No events yet.</p> : null}
      </div>
    </div>
  );
}
