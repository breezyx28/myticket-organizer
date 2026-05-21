import { Button } from '@/components/ui/Button';
import { ScannerConfirmDialog } from '@/components/scanners/ScannerConfirmDialog';
import {
  ScannerEmptyState,
  ScannerPanelToolbar,
  ScannerStatusBadge,
  ScannerSubsectionTitle,
} from '@/components/scanners/scannerUi';
import { toast } from '@/lib/appToast';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import { cn } from '@/lib/utils';
import {
  assignScanner,
  bulkAssignScannersToEvent,
  listScanners,
} from '@/services/scannersService';
import type { OrganizerEvent, ScannerAccount } from '@/types/domain';
import { UserMinus, UserPlus } from 'lucide-react';
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

  if (events.length === 0) {
    return (
      <ScannerEmptyState
        title="No live events"
        description="Publish an event before you can assign gate staff to scan tickets."
      />
    );
  }

  return (
    <>
      <ScannerPanelToolbar
        title="Per-event assignments"
        description="Pick an event, then assign or remove gate staff. Multiple scanners can share one entrance."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(220px,280px)_1fr] lg:gap-8">
        <aside>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-40">Events</p>
          <ul className="max-h-[min(420px,50vh)] space-y-1 overflow-y-auto rounded-2xl border border-ink-10 bg-ink-5/25 p-1.5">
            {events.map((ev) => {
              const count = scanners.filter((s) => s.assignedEventIds.includes(ev.id)).length;
              const selected = ev.id === selectedEventId;
              return (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedEventId(ev.id)}
                    className={cn(
                      'w-full rounded-xl px-3 py-2.5 text-left transition',
                      selected ? 'bg-ink text-white shadow-card-sm' : 'text-ink hover:bg-white'
                    )}
                  >
                    <p className="truncate text-[13px] font-bold leading-snug">{ev.title}</p>
                    <p className={cn('mt-0.5 text-[11px]', selected ? 'text-white/70' : 'text-ink-50')}>
                      {count} assigned
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {selectedEvent ? (
          <div className="min-w-0 rounded-2xl border border-ink-10 bg-surface-tint/80 p-4 sm:p-5">
            <div className="flex flex-col gap-2 border-b border-ink-10/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-40">Selected</p>
                <p className="text-[17px] font-extrabold leading-tight text-ink">{selectedEvent.title}</p>
              </div>
              <p className="text-[12px] font-semibold text-ink-60">
                <span className="text-ink">{assignedToEvent.length}</span> assigned ·{' '}
                <span className="text-ink">{availableActiveCount}</span> ready
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-ink-10 bg-white p-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 text-[12px] font-semibold text-ink-60">
                Gate label (optional)
                <input
                  className="mt-1.5 h-10 w-full rounded-xl border border-ink-10 px-3 text-[14px] text-ink outline-none focus:border-ink-30 focus:ring-2 focus:ring-ink/10"
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
                    Assign all ({availableActiveCount})
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
                    Unassign all
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <StaffColumn
                title="Assigned"
                count={assignedToEvent.length}
                emptyHint="No staff on this event yet."
                scanners={assignedToEvent}
                variant="assigned"
                renderActions={(s) => (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-coral/40 text-coral hover:bg-coral/10 sm:w-auto"
                    disabled={busy}
                    onClick={() => setUnassignTarget(s)}
                  >
                    <UserMinus className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Unassign
                  </Button>
                )}
              />
              <StaffColumn
                title="Available"
                count={availableForEvent.length}
                emptyHint={
                  scanners.length === 0
                    ? 'Add gate staff in the Accounts tab first.'
                    : 'Everyone active is already assigned here.'
                }
                scanners={availableForEvent}
                variant="available"
                renderActions={(s) => (
                  <Button
                    type="button"
                    variant="dark"
                    size="sm"
                    className="w-full sm:w-auto"
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
              <p className="mt-4 text-[12px] text-ink-40">Inactive accounts must be reactivated before assigning.</p>
            ) : null}
          </div>
        ) : null}
      </div>

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
    </>
  );
}

function StaffColumn({
  title,
  count,
  emptyHint,
  scanners,
  variant,
  renderActions,
}: {
  title: string;
  count: number;
  emptyHint: string;
  scanners: ScannerAccount[];
  variant: 'assigned' | 'available';
  renderActions: (s: ScannerAccount) => ReactNode;
}) {
  return (
    <div>
      <ScannerSubsectionTitle count={count}>{title}</ScannerSubsectionTitle>
      {scanners.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-20 bg-white/70 px-3 py-6 text-center text-[12px] leading-relaxed text-ink-40">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-2">
          {scanners.map((s) => (
            <li
              key={s.id}
              className={cn(
                'flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between',
                variant === 'assigned' ? 'border-mint/35 bg-mint/10' : 'border-ink-10 bg-white'
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-[13px] font-bold text-ink">{s.name}</p>
                  {!s.active ? <ScannerStatusBadge active={false} /> : null}
                </div>
                <p className="truncate text-[12px] text-ink-60">{s.email}</p>
              </div>
              <div className="shrink-0">{renderActions(s)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
