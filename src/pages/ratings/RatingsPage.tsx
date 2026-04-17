import { getRatingsAggregate, listGivenRatings, listRatings } from '@/services/ratingsService';
import type { GivenRating, RatingItem } from '@/types/domain';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

export function RatingsPage() {
  const [items, setItems] = useState<RatingItem[]>([]);
  const [given, setGiven] = useState<GivenRating[]>([]);
  const [aggregate, setAggregate] = useState<Awaited<ReturnType<typeof getRatingsAggregate>> | null>(null);
  const [tab, setTab] = useState<'received' | 'given' | 'byEvent'>('received');

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        const [received, givenRatings, aggr] = await Promise.all([listRatings(), listGivenRatings(), getRatingsAggregate()]);
        setItems(received);
        setGiven(givenRatings);
        setAggregate(aggr);
      })();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Reputation</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Ratings received</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-60">Mutual ratings unlock after completed engagements in the full product — here’s mock feedback.</p>
      </div>

      <div className="rounded-2xl border border-ink-10 bg-white p-2">
        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === 'received'} onClick={() => setTab('received')} label="Received" />
          <TabButton active={tab === 'given'} onClick={() => setTab('given')} label="Given" />
          <TabButton active={tab === 'byEvent'} onClick={() => setTab('byEvent')} label="By event" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile label="Overall average" value={aggregate ? aggregate.overallAverage.toFixed(2) : '—'} />
        <StatTile label="Received count" value={aggregate ? String(aggregate.totalReceived) : '—'} />
      </div>

      {tab === 'received' ? <div className="space-y-4">
        {items.map((r) => (
          <article key={r.id} className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Star className="fill-amber text-amber" size={22} strokeWidth={2} />
              <span className="font-mono text-2xl font-bold">{r.score.toFixed(1)}</span>
              <span className="text-[13px] font-semibold text-ink-60">{r.eventTitle}</span>
            </div>
            <p className="mt-3 text-[15px] font-medium text-ink">{r.comment}</p>
            <p className="mt-2 text-[12px] text-ink-40">
              From {r.from} · {new Date(r.at).toLocaleDateString()}
            </p>
          </article>
        ))}
        {items.length === 0 ? <p className="text-[14px] text-ink-40">No ratings yet.</p> : null}
      </div> : null}

      {tab === 'given' ? (
        <div className="space-y-3">
          {given.map((g) => (
            <article key={g.id} className="rounded-2xl border border-ink-10 bg-white px-4 py-3 text-[13px] shadow-card-sm">
              <p className="font-semibold text-ink">
                To {g.to} ({g.role}) · <span className="font-mono">{g.score.toFixed(1)}</span>
              </p>
              <p className="mt-1 text-ink-60">{g.comment}</p>
              <p className="mt-1 text-[11px] text-ink-40">
                {g.eventTitle} · {new Date(g.at).toLocaleDateString()}
              </p>
            </article>
          ))}
          {given.length === 0 ? <p className="text-[14px] text-ink-40">No given ratings yet.</p> : null}
        </div>
      ) : null}

      {tab === 'byEvent' ? (
        <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">Per-event averages</h2>
          <ul className="mt-3 space-y-2">
            {aggregate?.byEvent.map((row) => (
              <li key={row.eventId} className="flex items-center justify-between rounded-xl border border-ink-10 px-3 py-2">
                <span className="font-semibold text-ink">{row.eventTitle}</span>
                <span className="font-mono text-[12px] text-ink">{row.average.toFixed(2)} ({row.count})</span>
              </li>
            ))}
            {!aggregate?.byEvent.length ? <li className="text-[13px] text-ink-40">No event aggregates yet.</li> : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-[12px] font-semibold ${active ? 'bg-ink text-white' : 'bg-ink-5 text-ink-60'}`}
    >
      {label}
    </button>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink-10 bg-surface-tint px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-40">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-ink">{value}</p>
    </div>
  );
}
