import { getAttendanceByEvent } from '@/services/analyticsService';
import { listEvents } from '@/services/eventsService';
import { useCallback, useEffect, useState } from 'react';

export function AttendancePage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAttendanceByEvent>> | null>(null);
  const [eventId, setEventId] = useState('');
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);

  const reload = useCallback(async (selected = eventId) => {
    const [summary, ev] = await Promise.all([getAttendanceByEvent(selected || undefined), listEvents()]);
    setData(summary);
    setEvents(ev.map((e) => ({ id: e.id, title: e.title })));
  }, [eventId]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void reload('');
    }, 0);
    return () => window.clearTimeout(t);
  }, [reload]);

  const rate =
    data && data.sold > 0 ? Math.round((data.scansOk / data.sold) * 1000) / 10 : 0;

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Analytics</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Attendance &amp; scans</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-60">Scanned vs sold, attendance rate, and recent scan attempts.</p>
      </div>
      <div className="rounded-2xl border border-ink-10 bg-white p-4">
        <label className="text-[12px] font-semibold text-ink-60">
          Event filter
          <select
            value={eventId}
            onChange={(e) => {
              const next = e.target.value;
              setEventId(next);
              void reload(next);
            }}
            className="mt-1 w-full max-w-md rounded-xl border border-ink-10 px-3 py-2 text-[13px]"
          >
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <p className="text-[12px] font-semibold text-ink-60">Sold</p>
          <p className="mt-2 font-mono text-3xl font-bold">{data?.sold ?? '—'}</p>
        </div>
        <div className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <p className="text-[12px] font-semibold text-ink-60">Successful scans</p>
          <p className="mt-2 font-mono text-3xl font-bold">{data?.scansOk ?? '—'}</p>
        </div>
        <div className="rounded-3xl border border-ink-10 bg-lemon/30 p-6 shadow-card-sm">
          <p className="text-[12px] font-semibold text-ink-60">Attendance rate</p>
          <p className="mt-2 font-mono text-3xl font-bold">{data ? `${rate}%` : '—'}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-ink-10 bg-surface-tint p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold text-ink">No-shows (estimate)</h2>
        <p className="mt-2 font-mono text-4xl font-bold text-coral">{data?.noShow ?? '—'}</p>
        <p className="mt-2 text-[13px] text-ink-60">Demo heuristic: sold minus unique successful scans.</p>
      </section>

      <section className="rounded-3xl border border-ink-10 bg-ink p-6 text-white shadow-card-lg">
        <h2 className="text-lg font-extrabold">Recent scan logs</h2>
        <ul className="mt-4 space-y-2 text-[13px]">
          {data?.recent.map((l) => (
            <li key={l.id} className="flex flex-wrap justify-between gap-2 rounded-2xl bg-white/10 px-4 py-3">
              <span className="font-mono">{l.ticketRef}</span>
              <span className="uppercase text-lemon">{l.result}</span>
              <span className="text-white/70">{new Date(l.at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
