import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/appToast';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import {
  assignScanner,
  bulkAssignScannersToEvent,
  listScanners,
} from '@/services/scannersService';
import type { OrganizerEvent, ScannerAccount } from '@/types/domain';
import { CheckCircle2, QrCode, UsersRound } from 'lucide-react';
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
  const assignedCount = selectedEvent
    ? scanners.filter((s) => s.assignedEventIds.includes(selectedEvent.id)).length
    : 0;
  const activeScanners = scanners.filter((s) => s.active);
  const unassignedActive = selectedEvent
    ? activeScanners.filter((s) => !s.assignedEventIds.includes(selectedEvent.id))
    : [];

  async function handleAssign(scannerId: string) {
    if (!selectedEvent || busy) return;
    setBusy(true);
    try {
      await assignScanner(scannerId, selectedEvent.id, true);
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
      await reload();
    } catch (err) {
      toast.error(formatOrganizerApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignAllActive() {
    if (!selectedEvent || busy || unassignedActive.length === 0) return;
    setBusy(true);
    try {
      await bulkAssignScannersToEvent(
        selectedEvent.id,
        unassignedActive.map((s) => s.id),
        gateLabel.trim() || undefined
      );
      toast.success(`Assigned ${unassignedActive.length} scanner(s) to ${selectedEvent.title}.`);
      await reload();
    } catch (err) {
      toast.error(formatOrganizerApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-ink">Assign scanners to events</h2>
          <p className="mt-1 text-[13px] text-ink-60">
            One event can have multiple gate scanners. Assign uses the bulk assignments API; unassign revokes a single
            assignment.
          </p>
        </div>
        <div className="grid min-w-[220px] grid-cols-2 gap-2">
          <StatBadge label="Events" value={String(events.length)} icon={<QrCode className="h-4 w-4" />} />
          <StatBadge label="Active scanners" value={String(activeScanners.length)} icon={<UsersRound className="h-4 w-4" />} />
        </div>
      </div>

      {events.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-ink-10 bg-ink-5/40 px-4 py-3 text-[13px] text-ink-50">
          No live/published events to assign scanners to yet.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => {
              const count = scanners.filter((s) => s.assignedEventIds.includes(ev.id)).length;
              const selected = ev.id === selectedEventId;
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setSelectedEventId(ev.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    selected
                      ? 'border-ink bg-ink text-white shadow-card-sm'
                      : 'border-ink-10 bg-ink-5/30 text-ink hover:bg-ink-5'
                  }`}
                >
                  <p className="truncate text-[13px] font-bold">{ev.title}</p>
                  <p className={`mt-1 text-[11px] ${selected ? 'text-white/80' : 'text-ink-50'}`}>
                    {count} scanner{count === 1 ? '' : 's'} assigned
                  </p>
                </button>
              );
            })}
          </div>

          {selectedEvent ? (
            <div className="mt-6 rounded-2xl border border-ink-10 bg-surface-tint p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-40">Selected event</p>
                  <p className="text-[16px] font-extrabold text-ink">{selectedEvent.title}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase text-ink-60 ring-1 ring-ink-10">
                  {assignedCount} assigned
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-2">
                <label className="min-w-[200px] flex-1 text-[12px] font-semibold text-ink-60">
                  Gate label (optional, UI only for bulk assign)
                  <input
                    className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 text-[13px]"
                    value={gateLabel}
                    placeholder="e.g. Main Entrance"
                    onChange={(e) => setGateLabel(e.target.value)}
                    disabled={busy}
                  />
                </label>
                {unassignedActive.length > 0 ? (
                  <Button
                    type="button"
                    variant="dark"
                    size="sm"
                    disabled={busy}
                    onClick={() => void handleAssignAllActive()}
                  >
                    Assign all active ({unassignedActive.length})
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                {scanners.map((s) => {
                  const assigned = s.assignedEventIds.includes(selectedEvent.id);
                  return (
                    <div
                      key={s.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-3 ${
                        assigned ? 'border-mint/50 bg-mint/10' : 'border-ink-10 bg-white'
                      }`}
                    >
                      <div>
                        <p className="text-[13px] font-bold text-ink">{s.name}</p>
                        <p className="text-[12px] text-ink-60">{s.email}</p>
                        <p className="mt-0.5 text-[11px] text-ink-40">{s.active ? 'Active scanner' : 'Inactive scanner'}</p>
                      </div>
                      <Button
                        type="button"
                        variant={assigned ? 'dark' : 'outline'}
                        size="sm"
                        disabled={!s.active || busy}
                        onClick={() => {
                          if (assigned) void handleUnassign(s.id);
                          else void handleAssign(s.id);
                        }}
                      >
                        {assigned ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Assigned
                          </>
                        ) : (
                          'Assign'
                        )}
                      </Button>
                    </div>
                  );
                })}
                {scanners.length === 0 ? (
                  <p className="text-[13px] text-ink-40">No scanners yet — add gate staff in the Accounts tab.</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function StatBadge({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-10 bg-ink-5/40 px-3 py-2">
      <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-40">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[16px] font-bold text-ink">{value}</p>
    </div>
  );
}
