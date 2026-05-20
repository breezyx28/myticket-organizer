import { Button } from '@/components/ui/Button';
import { ScannerConfirmDialog } from '@/components/scanners/ScannerConfirmDialog';
import { toast } from '@/lib/appToast';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import {
  assignScanner,
  bulkAssignScannersToEvent,
  listScanners,
} from '@/services/scannersService';
import type { OrganizerEvent, ScannerAccount } from '@/types/domain';
import { QrCode, UserMinus, UserPlus, UsersRound } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

export function ScannerAssignmentPanel({
  events,
  initialEventId,
  onAssignmentsChange,
}: {
  events: OrganizerEvent[];
  initialEventId?: string;
  onAssignmentsChange?: () => void | Promise<void>;
}) {
  const [scanners, setScanners] = useState<ScannerAccount[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [gateLabel, setGateLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<ScannerAccount | null>(null);
  const [unassignAllOpen, setUnassignAllOpen] = useState(false);

  async function reload() {
    setScanners(await listScanners());
    await onAssignmentsChange?.();
  }

  useEffect(() => {
    const t = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (initialEventId && events.some((e) => e.id === initialEventId)) {
        setSelectedEventId(initialEventId);
        return;
      }
      if (!selectedEventId && events.length > 0) {
        setSelectedEventId(events[0].id);
      }
      if (selectedEventId && !events.some((e) => e.id === selectedEventId) && events.length > 0) {
        setSelectedEventId(events[0].id);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [events, initialEventId, selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const activeScanners = scanners.filter((s) => s.active);
  const assignedToEvent = selectedEvent
    ? scanners.filter((s) => s.assignedEventIds.includes(selectedEvent.id))
    : [];
  const availableForEvent = selectedEvent
    ? scanners.filter((s) => !s.assignedEventIds.includes(selectedEvent.id))
    : [];
  const availableActiveCount = availableForEvent.filter((s) => s.active).length;

  async function handleAssign(scannerId: string) {
    if (!selectedEvent || busy) return;
    setBusy(true);
    try {
      await assignScanner(scannerId, selectedEvent.id, true);
      toast.success('Scanner assigned to event.');
      await reload();
    } catch (err) {
      toast.error(formatOrganizerApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnassign(scannerId: string) {
    if (!selectedEvent || busy) return;
    setBusy(true);
    try {
      await assignScanner(scannerId, selectedEvent.id, false);
      toast.success('Scanner unassigned from event.');
      setUnassignTarget(null);
      await reload();
    } catch (err) {
      toast.error(formatOrganizerApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignAllActive() {
    if (!selectedEvent || busy || availableForEvent.length === 0) return;
    setBusy(true);
    try {
      await bulkAssignScannersToEvent(
        selectedEvent.id,
        availableForEvent.map((s) => s.id),
        gateLabel.trim() || undefined
      );
      toast.success(`Assigned ${availableForEvent.length} scanner(s) to ${selectedEvent.title}.`);
      await reload();
    } catch (err) {
      toast.error(formatOrganizerApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnassignAll() {
    if (!selectedEvent || busy || assignedToEvent.length === 0) return;
    setBusy(true);
    try {
      for (const s of assignedToEvent) {
        await assignScanner(s.id, selectedEvent.id, false);
      }
      toast.success(`Unassigned ${assignedToEvent.length} scanner(s) from ${selectedEvent.title}.`);
      setUnassignAllOpen(false);
      await reload();
    } catch (err) {
      toast.error(formatOrganizerApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm sm:p-8">
        <div className="flex flex-col gap-4 border-b border-ink-10 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-ink">Event assignments</h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-60">
              Choose an event, then assign or unassign gate staff. Multiple scanners can work the same entrance.
            </p>
          </div>
          <div className="grid min-w-[200px] grid-cols-2 gap-3">
            <StatBadge label="Live events" value={String(events.length)} icon={<QrCode className="h-4 w-4" />} />
            <StatBadge
              label="Active staff"
              value={String(activeScanners.length)}
              icon={<UsersRound className="h-4 w-4" />}
            />
          </div>
        </div>

        {events.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-ink-10 bg-ink-5/40 px-5 py-4 text-[14px] text-ink-50">
            No live or published events yet. Publish an event before assigning scanners.
          </p>
        ) : (
          <>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-wide text-ink-40">Select event</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((ev) => {
                const count = scanners.filter((s) => s.assignedEventIds.includes(ev.id)).length;
                const selected = ev.id === selectedEventId;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`rounded-2xl border px-4 py-3.5 text-left transition ${
                      selected
                        ? 'border-ink bg-ink text-white shadow-card-sm'
                        : 'border-ink-10 bg-ink-5/30 text-ink hover:border-ink-20 hover:bg-ink-5'
                    }`}
                  >
                    <p className="truncate text-[14px] font-bold leading-snug">{ev.title}</p>
                    <p className={`mt-1.5 text-[12px] ${selected ? 'text-white/75' : 'text-ink-50'}`}>
                      {count} assigned
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {selectedEvent && events.length > 0 ? (
        <section className="rounded-3xl border border-ink-10 bg-surface-tint p-6 shadow-card-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-40">Working on</p>
              <p className="text-[18px] font-extrabold text-ink">{selectedEvent.title}</p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-white px-3.5 py-1.5 text-[12px] font-bold text-ink ring-1 ring-ink-10">
              {assignedToEvent.length} assigned · {availableActiveCount} ready to assign
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-ink-10 bg-white p-4 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-[12px] font-semibold text-ink-60">
              Gate label (optional, for bulk assign email)
              <input
                className="mt-1.5 h-10 w-full rounded-xl border border-ink-10 bg-white px-3 text-[14px] text-ink"
                value={gateLabel}
                placeholder="e.g. North Entrance"
                onChange={(e) => setGateLabel(e.target.value)}
                disabled={busy}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {availableActiveCount > 0 ? (
                <Button type="button" variant="dark" size="sm" disabled={busy} onClick={() => void handleAssignAllActive()}>
                  <UserPlus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Assign all active ({availableActiveCount})
                </Button>
              ) : null}
              {assignedToEvent.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-coral/40 text-coral hover:bg-coral/10"
                  disabled={busy}
                  onClick={() => setUnassignAllOpen(true)}
                >
                  <UserMinus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Unassign all ({assignedToEvent.length})
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-8">
            <ScannerListSection
              title="Assigned to this event"
              emptyHint="No scanners assigned yet. Use the list below to assign staff."
              scanners={assignedToEvent}
              renderActions={(s) => (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-w-[130px] border-coral/40 text-coral hover:bg-coral/10"
                  disabled={busy}
                  onClick={() => setUnassignTarget(s)}
                >
                  <UserMinus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Unassign
                </Button>
              )}
            />
          </div>

          <div className="mt-8">
            <ScannerListSection
              title="Available to assign"
              emptyHint={scanners.length === 0 ? 'No gate staff — add accounts in the Accounts tab.' : 'All active staff are already assigned to this event.'}
              scanners={availableForEvent}
              muted
              renderActions={(s) => (
                <Button
                  type="button"
                  variant="dark"
                  size="sm"
                  className="min-w-[130px]"
                  disabled={busy || !s.active}
                  onClick={() => void handleAssign(s.id)}
                >
                  <UserPlus className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Assign
                </Button>
              )}
            />
          </div>

          {scanners.some((s) => !s.active) ? (
            <p className="mt-6 text-[12px] text-ink-40">Inactive accounts cannot be assigned until reactivated on the server.</p>
          ) : null}
        </section>
      ) : null}

      <ScannerConfirmDialog
        open={unassignTarget != null}
        title="Unassign from event?"
        description={
          unassignTarget && selectedEvent
            ? `Remove "${unassignTarget.name}" from "${selectedEvent.title}"? They can still scan other events they are assigned to.`
            : ''
        }
        confirmLabel="Unassign"
        loading={busy}
        onCancel={() => !busy && setUnassignTarget(null)}
        onConfirm={() => unassignTarget && void handleUnassign(unassignTarget.id)}
      />

      <ScannerConfirmDialog
        open={unassignAllOpen}
        title="Unassign all from event?"
        description={
          selectedEvent
            ? `Remove all ${assignedToEvent.length} scanner(s) from "${selectedEvent.title}"? Accounts are not deleted.`
            : ''
        }
        confirmLabel="Unassign all"
        loading={busy}
        onCancel={() => !busy && setUnassignAllOpen(false)}
        onConfirm={() => void handleUnassignAll()}
      />
    </div>
  );
}

function ScannerListSection({
  title,
  emptyHint,
  scanners,
  renderActions,
  muted,
}: {
  title: string;
  emptyHint: string;
  scanners: ScannerAccount[];
  renderActions: (s: ScannerAccount) => ReactNode;
  muted?: boolean;
}) {
  return (
    <div>
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-50">{title}</h3>
      {scanners.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-ink-20 bg-white/60 px-4 py-5 text-[13px] text-ink-40">
          {emptyHint}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {scanners.map((s) => (
            <li
              key={s.id}
              className={`flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                muted ? 'border-ink-10 bg-white' : 'border-mint/40 bg-mint/10'
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-bold text-ink">{s.name}</p>
                  {!s.active ? (
                    <span className="rounded-full bg-ink-10 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-50">
                      Inactive
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-[13px] text-ink-60">{s.email}</p>
              </div>
              <div className="shrink-0">{renderActions(s)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatBadge({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-10 bg-ink-5/40 px-4 py-3">
      <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-40">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-mono text-[18px] font-bold leading-none text-ink">{value}</p>
    </div>
  );
}
