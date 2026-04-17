import { Button } from '@/components/ui/Button';
import { duplicateEvent, listEvents } from '@/services/eventsService';
import type { OrganizerEvent } from '@/types/domain';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export function EventArchivePage() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void listEvents().then((all) => setEvents(all.filter((e) => e.status === 'archived')));
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Archive</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Archived events</h1>
        <p className="mt-2 max-w-xl text-[15px] text-ink-60">Hidden from public discovery — duplicate to spin up the next edition.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {events.map((e) => (
          <article key={e.id} className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
            <h2 className="text-lg font-extrabold text-ink">{e.title}</h2>
            <p className="mt-1 text-[13px] text-ink-60">{e.venue}, {e.city}</p>
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
                  duplicateEvent(e.id);
                  void listEvents().then((all) => setEvents(all.filter((x) => x.status === 'archived')));
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
        {events.length === 0 ? <p className="text-[14px] text-ink-40">No archived events.</p> : null}
      </div>
    </div>
  );
}
