import { CancellationFlow } from '@/components/events/CancellationFlow';
import { PublishImpactDialog } from '@/components/events/PublishImpactDialog';
import { RecurrenceManager } from '@/components/events/RecurrenceManager';
import { SeatLayoutBuilder } from '@/components/events/SeatLayoutBuilder';
import { Button } from '@/components/ui/Button';
import {
  appendChangeLog,
  buildSeatsFromGrid,
  cancelOccurrence,
  createDraftEvent,
  getEvent,
  listEventNotifications,
  patchEvent,
  publishEvent,
  setEventStatus,
  simulateLifecycleTick,
  validateFreeLayoutTotals,
} from '@/services/eventsService';
import { getProfile, isProfileComplete } from '@/services/profileService';
import type { EntryMode, LayoutType, OrganizerEvent } from '@/types/domain';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

export function EventEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bootstrapped = useRef(false);
  const [event, setEvent] = useState<OrganizerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOk, setProfileOk] = useState(true);
  const [impactOpen, setImpactOpen] = useState(false);
  const [pendingPatch, setPendingPatch] = useState<Partial<OrganizerEvent> | null>(null);
  const [impactChanges, setImpactChanges] = useState<{ field: string; old: string; new: string }[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [mediaLabel, setMediaLabel] = useState('');
  const [newTicketTypeLabel, setNewTicketTypeLabel] = useState('');

  const committed = useRef<OrganizerEvent | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        const p = await getProfile();
        setProfileOk(isProfileComplete(p));
      })();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!id) return;
    if (id === 'new') {
      if (bootstrapped.current) return;
      bootstrapped.current = true;
      const ev = createDraftEvent();
      navigate(`/events/${ev.id}`, { replace: true });
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        const ev = await getEvent(id);
        setEvent(ev);
        if (ev) committed.current = JSON.parse(JSON.stringify(ev)) as OrganizerEvent;
        setLoading(false);
      })();
    }, 0);
    return () => window.clearTimeout(t);
  }, [id, navigate]);

  const statusLine = useMemo(() => {
    if (!event) return '';
    return `Status: ${event.status} · Sold: ${event.ticketsSold} · Entry: ${event.entryMode}`;
  }, [event]);

  if (id === 'new') {
    return (
      <div className="py-20 text-center text-[14px] text-ink-60">
        Creating draft…
      </div>
    );
  }

  if (!profileOk) {
    return <Navigate to="/profile" replace />;
  }

  if (loading || !event) {
    return <div className="py-20 text-center text-[14px] text-ink-60">Loading…</div>;
  }

  const freeValidation = validateFreeLayoutTotals(event);
  const notifications = listEventNotifications().filter((n) => n.eventId === event.id);

  function updateLocal(updater: (e: OrganizerEvent) => OrganizerEvent) {
    setEvent((cur) => (cur ? updater(cur) : cur));
  }

  function partialChanges(prev: OrganizerEvent, patch: Partial<OrganizerEvent>) {
    const out: { field: string; old: string; new: string }[] = [];
    for (const k of Object.keys(patch) as (keyof OrganizerEvent)[]) {
      if (k === 'seats' || k === 'occurrences' || k === 'lastChangeLog' || k === 'postEventMedia') continue;
      const before = prev[k];
      const after = patch[k];
      if (after === undefined) continue;
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        out.push({ field: String(k), old: String(before ?? ''), new: String(after ?? '') });
      }
    }
    return out;
  }

  function save(patch: Partial<OrganizerEvent>) {
    if (!committed.current) return;
    const base = committed.current;
    const sold = base.ticketsSold > 0 && (base.status === 'published' || base.status === 'sold_out' || base.status === 'in_progress');
    if (sold) {
      const changes = partialChanges(base, patch);
      if (changes.length > 0) {
        setPendingPatch(patch);
        setImpactChanges(changes);
        setImpactOpen(true);
        return;
      }
    }
    patchEvent(base.id, patch);
    const merged = { ...base, ...patch } as OrganizerEvent;
    committed.current = merged;
    setEvent(merged);
  }

  function confirmImpactSave() {
    if (!pendingPatch || !committed.current) return;
    const base = committed.current;
    const changes = partialChanges(base, pendingPatch);
    patchEvent(base.id, pendingPatch);
    appendChangeLog(base.id, changes);
    const merged = { ...base, ...pendingPatch } as OrganizerEvent;
    committed.current = merged;
    setEvent(merged);
    setImpactOpen(false);
    setPendingPatch(null);
  }

  async function reloadFromStore() {
    if (!id) return;
    const ev = await getEvent(id);
    setEvent(ev);
    if (ev) committed.current = JSON.parse(JSON.stringify(ev)) as OrganizerEvent;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Event editor</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{event.title}</h1>
          <p className="mt-2 text-[13px] text-ink-60">{statusLine}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/events">
            <Button variant="outline" size="md">
              Back
            </Button>
          </Link>
          {event.status === 'draft' ? (
            <Button
              variant="dark"
              size="md"
              onClick={() => {
                publishEvent(event.id);
                void reloadFromStore();
              }}
            >
              Publish
            </Button>
          ) : null}
          {event.status !== 'cancelled' && event.status !== 'archived' ? (
            <Button variant="danger" size="md" onClick={() => setCancelOpen(true)}>
              Cancel event
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              simulateLifecycleTick(event.id);
              void reloadFromStore();
            }}
          >
            Next lifecycle
          </Button>
        </div>
      </div>
      <section className="rounded-2xl border border-ink-10 bg-ink-5/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12px] font-semibold text-ink-60">Set status:</p>
          {(['draft', 'published', 'sold_out', 'in_progress', 'ended', 'archived'] as const).map((st) => (
            <button
              key={st}
              type="button"
              className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
                event.status === st ? 'bg-ink text-white' : 'bg-white text-ink-60 ring-1 ring-ink-10'
              }`}
              onClick={() => {
                setEventStatus(event.id, st);
                void reloadFromStore();
              }}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
          <Link to={`/scanners?eventId=${encodeURIComponent(event.id)}`} className="ml-auto text-[12px] font-semibold text-coral hover:underline">
            Assign scanners
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold text-ink">Basics</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Title">
            <input
              className="mt-1 w-full rounded-xl border border-ink-10 px-3 py-2 text-[14px]"
              value={event.title}
              onChange={(e) => updateLocal((cur) => ({ ...cur, title: e.target.value }))}
              onBlur={(e) => save({ title: e.target.value })}
            />
          </Field>
          <Field label="Category">
            <input
              className="mt-1 w-full rounded-xl border border-ink-10 px-3 py-2 text-[14px]"
              value={event.category}
              onChange={(e) => updateLocal((cur) => ({ ...cur, category: e.target.value }))}
              onBlur={(e) => save({ category: e.target.value })}
            />
          </Field>
          <Field label="Venue" className="md:col-span-2">
            <input
              className="mt-1 w-full rounded-xl border border-ink-10 px-3 py-2 text-[14px]"
              value={event.venue}
              onChange={(e) => updateLocal((cur) => ({ ...cur, venue: e.target.value }))}
              onBlur={(e) => save({ venue: e.target.value })}
            />
          </Field>
          <Field label="City">
            <input
              className="mt-1 w-full rounded-xl border border-ink-10 px-3 py-2 text-[14px]"
              value={event.city}
              onChange={(e) => updateLocal((cur) => ({ ...cur, city: e.target.value }))}
              onBlur={(e) => save({ city: e.target.value })}
            />
          </Field>
          <Field label="Starts">
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-ink-10 px-3 py-2 font-mono text-[13px]"
              value={toLocalInput(event.startsAt)}
              onChange={(e) => updateLocal((cur) => ({ ...cur, startsAt: fromLocalInput(e.target.value) }))}
              onBlur={(e) => save({ startsAt: fromLocalInput(e.target.value) })}
            />
          </Field>
          <Field label="Ends">
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-ink-10 px-3 py-2 font-mono text-[13px]"
              value={toLocalInput(event.endsAt)}
              onChange={(e) => updateLocal((cur) => ({ ...cur, endsAt: fromLocalInput(e.target.value) }))}
              onBlur={(e) => save({ endsAt: fromLocalInput(e.target.value) })}
            />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              rows={4}
              className="mt-1 w-full rounded-xl border border-ink-10 px-3 py-2 text-[14px]"
              value={event.description}
              onChange={(e) => updateLocal((cur) => ({ ...cur, description: e.target.value }))}
              onBlur={(e) => save({ description: e.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-3xl border border-ink-10 bg-surface-tint p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold text-ink">Layout &amp; schedule</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Layout type">
            <select
              className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 text-[14px]"
              value={event.layoutType}
              onChange={(e) => {
                const layoutType = e.target.value as LayoutType;
                setEvent((cur) => {
                  if (!cur) return cur;
                  const next: OrganizerEvent = { ...cur, layoutType };
                  if (layoutType === 'free') next.seats = [];
                  else
                    next.seats = buildSeatsFromGrid({
                      ...next,
                      rows: next.rows || 6,
                      cols: next.cols || 10,
                      ticketTypes: next.ticketTypes,
                    });
                  queueMicrotask(() => save({ layoutType: next.layoutType, seats: next.seats }));
                  return next;
                });
              }}
            >
              <option value="grid">Grid</option>
              <option value="section">Section</option>
              <option value="free">Free</option>
            </select>
          </Field>
          <Field label="Rows (regen seats)">
            <input
              type="number"
              min={1}
              max={24}
              className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[14px]"
              value={event.rows}
              disabled={event.layoutType === 'free'}
              onChange={(e) => {
                const rows = Number(e.target.value);
                updateLocal((cur) => ({
                  ...cur,
                  rows,
                  seats: cur.layoutType === 'free' ? [] : buildSeatsFromGrid({ ...cur, rows }),
                }));
              }}
              onBlur={() => {
                if (event.layoutType === 'free') return;
                save({ rows: event.rows, seats: event.seats });
              }}
            />
          </Field>
          <Field label="Columns">
            <input
              type="number"
              min={1}
              max={32}
              className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[14px]"
              value={event.cols}
              disabled={event.layoutType === 'free'}
              onChange={(e) => {
                const cols = Number(e.target.value);
                updateLocal((cur) => ({
                  ...cur,
                  cols,
                  seats: cur.layoutType === 'free' ? [] : buildSeatsFromGrid({ ...cur, cols }),
                }));
              }}
              onBlur={() => {
                if (event.layoutType === 'free') return;
                save({ cols: event.cols, seats: event.seats });
              }}
            />
          </Field>
        </div>
        <div className="mt-6">
          <RecurrenceManager
            value={event.recurrence ?? null}
            onChange={(r) => {
              updateLocal((cur) => ({ ...cur, recurrence: r }));
              save({ recurrence: r });
            }}
          />
        </div>
        {event.occurrences.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-ink-10 bg-white p-4">
            <h3 className="text-[14px] font-extrabold text-ink">Recurring occurrences</h3>
            <ul className="mt-2 space-y-2">
              {event.occurrences.map((occ) => (
                <li key={occ.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-10 px-3 py-2 text-[12px]">
                  <span className="font-mono text-ink">{new Date(occ.startsAt).toLocaleString()}</span>
                  <span className="rounded-full bg-ink-5 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-60">{occ.status}</span>
                  {occ.status !== 'cancelled' ? (
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-coral hover:underline"
                      onClick={() => {
                        cancelOccurrence(event.id, occ.id);
                        void reloadFromStore();
                      }}
                    >
                      Cancel occurrence
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold text-ink">Seat map</h2>
        <div className="mt-4">
          <SeatLayoutBuilder
            event={event}
            onApplyTemplate={(rows, cols) => {
              const seats = buildSeatsFromGrid({ ...event, rows, cols, ticketTypes: event.ticketTypes });
              updateLocal((cur) => ({ ...cur, rows, cols, seats }));
              save({ rows, cols, seats });
            }}
            onChangeSeats={(seats) => {
              updateLocal((cur) => ({ ...cur, seats }));
              save({ seats });
            }}
            onChangeSpacing={(patch) => {
              updateLocal((cur) => ({ ...cur, ...patch }));
              save(patch);
            }}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-ink-10 bg-ink-5/40 p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold text-ink">Ticketing rules</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Entry mode">
            <select
              className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 text-[14px]"
              value={event.entryMode}
              onChange={(e) => {
                const entryMode = e.target.value as EntryMode;
                updateLocal((cur) => ({ ...cur, entryMode }));
                save({ entryMode });
              }}
            >
              <option value="one_time">One-time entry</option>
              <option value="multi_scan">Multi-scan</option>
            </select>
          </Field>
          <Field label="Purchase limit / user (optional)">
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[14px]"
              value={event.purchaseLimitPerUser ?? ''}
              placeholder="Unlimited"
              onChange={(e) => {
                const v = e.target.value;
                updateLocal((cur) => ({ ...cur, purchaseLimitPerUser: v ? Number(v) : undefined }));
              }}
              onBlur={(e) => {
                const v = e.target.value;
                save({ purchaseLimitPerUser: v ? Number(v) : undefined });
              }}
            />
          </Field>
          <Field label="Multi-day ticketing">
            <label className="mt-2 flex items-center gap-2 text-[14px] text-ink-60">
              <input
                type="checkbox"
                checked={event.multiDaySingleTicket}
                onChange={(e) => {
                  const multiDaySingleTicket = e.target.checked;
                  updateLocal((cur) => ({ ...cur, multiDaySingleTicket }));
                  save({ multiDaySingleTicket });
                }}
              />
              One ticket covers full span (when applicable)
            </label>
          </Field>
          {event.layoutType === 'free' ? (
            <Field label="Max capacity">
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[14px]"
                value={event.capacity}
                onChange={(e) => updateLocal((cur) => ({ ...cur, capacity: Number(e.target.value) }))}
                onBlur={(e) => save({ capacity: Number(e.target.value) })}
              />
            </Field>
          ) : null}
        </div>
        <div className="mt-5 rounded-2xl border border-ink-10 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[14px] font-extrabold text-ink">Ticket types</h3>
            <span className="text-[11px] text-ink-40">Per-seat pricing (grid/section) or quantity limits (free)</span>
          </div>
          <div className="mt-3 space-y-2">
            {event.ticketTypes.map((tt) => (
              <div key={tt.id} className="grid gap-2 rounded-xl border border-ink-10 p-2 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
                <input
                  className="rounded-lg border border-ink-10 px-2 py-1.5 text-[12px]"
                  value={tt.label}
                  onChange={(e) => {
                    const next = event.ticketTypes.map((x) => (x.id === tt.id ? { ...x, label: e.target.value } : x));
                    updateLocal((cur) => ({ ...cur, ticketTypes: next }));
                  }}
                  onBlur={() => save({ ticketTypes: event.ticketTypes })}
                />
                <input
                  type="number"
                  className="rounded-lg border border-ink-10 px-2 py-1.5 font-mono text-[12px]"
                  value={tt.defaultPrice}
                  onChange={(e) => {
                    const next = event.ticketTypes.map((x) => (x.id === tt.id ? { ...x, defaultPrice: Number(e.target.value) } : x));
                    updateLocal((cur) => ({ ...cur, ticketTypes: next }));
                  }}
                  onBlur={() => save({ ticketTypes: event.ticketTypes })}
                />
                {event.layoutType === 'free' ? (
                  <input
                    type="number"
                    min={0}
                    className="rounded-lg border border-ink-10 px-2 py-1.5 font-mono text-[12px]"
                    value={tt.quantityLimit ?? 0}
                    onChange={(e) => {
                      const next = event.ticketTypes.map((x) =>
                        x.id === tt.id ? { ...x, quantityLimit: Number(e.target.value) } : x
                      );
                      updateLocal((cur) => ({ ...cur, ticketTypes: next }));
                    }}
                    onBlur={() => save({ ticketTypes: event.ticketTypes })}
                  />
                ) : (
                  <div className="rounded-lg border border-ink-10 bg-ink-5 px-2 py-1.5 text-[11px] text-ink-40">Per-seat</div>
                )}
                <button
                  type="button"
                  className="rounded-full px-2 py-1 text-[11px] font-semibold text-coral hover:bg-coral/10"
                  onClick={() => {
                    const next = event.ticketTypes.filter((x) => x.id !== tt.id);
                    if (next.length === 0) return;
                    updateLocal((cur) => ({ ...cur, ticketTypes: next }));
                    save({ ticketTypes: next });
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="min-w-[220px] flex-1 rounded-xl border border-ink-10 px-3 py-2 text-[13px]"
              placeholder="New type label (e.g. Economy)"
              value={newTicketTypeLabel}
              onChange={(e) => setNewTicketTypeLabel(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const label = newTicketTypeLabel.trim();
                if (!label) return;
                const next = [
                  ...event.ticketTypes,
                  { id: `tt_${Date.now()}`, label, defaultPrice: 80, quantityLimit: event.layoutType === 'free' ? 0 : undefined },
                ];
                setNewTicketTypeLabel('');
                updateLocal((cur) => ({ ...cur, ticketTypes: next }));
                save({ ticketTypes: next });
              }}
            >
              Add type
            </Button>
          </div>
          {event.layoutType === 'free' ? (
            <p className={`mt-3 text-[12px] ${freeValidation.ok ? 'text-mint-dark' : 'text-coral'}`}>
              Free-layout quantities: {freeValidation.total} / {freeValidation.capacity}{' '}
              {!freeValidation.ok ? '(exceeds capacity)' : '(within capacity)'}
            </p>
          ) : null}
        </div>
        {event.status === 'sold_out' ? (
          <div className="mt-4 rounded-2xl border border-indigo/30 bg-indigo/10 p-4 text-[13px] text-ink">
            <strong>Waitlist (demo)</strong>: {event.waitlistCount ?? 0} users are waiting for ticket availability.
          </div>
        ) : null}
      </section>

      {event.status === 'archived' || event.status === 'ended' ? (
        <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">Post-event media</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              className="min-w-[200px] flex-1 rounded-xl border border-ink-10 px-3 py-2 text-[14px]"
              placeholder="filename or label"
              value={mediaLabel}
              onChange={(e) => setMediaLabel(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => {
                if (!mediaLabel.trim()) return;
                const nextMedia = [...event.postEventMedia, { kind: 'photo' as const, label: mediaLabel.trim() }];
                setMediaLabel('');
                updateLocal((cur) => ({ ...cur, postEventMedia: nextMedia }));
                save({ postEventMedia: nextMedia });
              }}
            >
              Add media (demo)
            </Button>
          </div>
          <ul className="mt-3 text-[13px] text-ink-60">
            {event.postEventMedia.map((m, i) => (
              <li key={`${m.label}-${i}`}>
                {m.kind}: {m.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {notifications.length > 0 ? (
        <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">Buyer notifications (demo queue)</h2>
          <ul className="mt-3 space-y-2">
            {notifications.slice(-5).reverse().map((n) => (
              <li key={n.id} className="rounded-xl border border-ink-10 bg-ink-5/40 px-3 py-2 text-[12px]">
                <p className="font-semibold text-ink">
                  {n.kind === 'cancelled' ? 'Event cancelled notice' : 'Post-publish update notice'} ·{' '}
                  {new Date(n.createdAt).toLocaleString()}
                </p>
                {n.changes?.length ? <p className="mt-1 text-ink-60">{n.changes.length} changed field(s) included in notification.</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PublishImpactDialog
        open={impactOpen}
        changes={impactChanges}
        onCancel={() => {
          setImpactOpen(false);
          setPendingPatch(null);
          void reloadFromStore();
        }}
        onConfirm={confirmImpactSave}
      />

      {cancelOpen ? (
        <CancellationFlow
          eventId={event.id}
          eventTitle={event.title}
          onClose={() => setCancelOpen(false)}
          onDone={() => {
            setCancelOpen(false);
            void reloadFromStore();
          }}
        />
      ) : null}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span className="text-[12px] font-semibold text-ink-60">{label}</span>
      {children}
    </label>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string) {
  return new Date(v).toISOString();
}
