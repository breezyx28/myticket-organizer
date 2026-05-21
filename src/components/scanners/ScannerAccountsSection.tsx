import { Button } from '@/components/ui/Button';
import { ScannerConfirmDialog } from '@/components/scanners/ScannerConfirmDialog';
import { ScannerEditDialog } from '@/components/scanners/ScannerEditDialog';
import { deleteScanner } from '@/services/scannersService';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import { toast } from '@/lib/appToast';
import type { OrganizerEvent, ScannerAccount } from '@/types/domain';
import { Mail, Pencil, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

export function ScannerAccountsSection({
  scanners,
  events,
  onAddStaff,
  onGoToAssignments,
  onChanged,
}: {
  scanners: ScannerAccount[];
  events: OrganizerEvent[];
  onAddStaff: () => void;
  onGoToAssignments: (eventId?: string) => void;
  onChanged: () => void | Promise<void>;
}) {
  const [editTarget, setEditTarget] = useState<ScannerAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScannerAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeCount = scanners.filter((s) => s.active).length;
  const eventTitleById = Object.fromEntries(events.map((e) => [e.id, e.title]));

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteScanner(deleteTarget.id);
      toast.success(`Removed scanner "${deleteTarget.name}".`);
      setDeleteTarget(null);
      await onChanged();
    } catch (err) {
      toast.error(formatOrganizerApiError(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm sm:p-8">
      <div className="flex flex-col gap-4 border-b border-ink-10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 shrink-0 text-ink-50" strokeWidth={2} aria-hidden />
            <h2 className="text-xl font-extrabold tracking-tight text-ink">Gate staff accounts</h2>
          </div>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-60">
            Create staff, edit name or login email, reset passwords, and enable or disable accounts without deleting
            them.
          </p>
        </div>
        <Button variant="dark" size="md" className="shrink-0 self-start" onClick={onAddStaff}>
          Add gate staff
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <MetricTile label="Total accounts" value={String(scanners.length)} />
        <MetricTile label="Active" value={String(activeCount)} />
        <MetricTile label="Inactive" value={String(scanners.length - activeCount)} />
      </div>

      {scanners.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink-20 bg-ink-5/30 px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-ink">No gate staff yet</p>
          <p className="mt-2 text-[13px] text-ink-50">Create a scanner account to assign staff to event entrances.</p>
          <Button variant="dark" size="md" className="mt-5" onClick={onAddStaff}>
            Add gate staff
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {scanners.map((s) => {
            const assignmentLabels = s.assignedEventIds.map((id) => eventTitleById[id] ?? `Event #${id}`);
            return (
              <li
                key={s.id}
                className="rounded-2xl border border-ink-10 bg-ink-5/20 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[16px] font-extrabold text-ink">{s.name}</p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          s.active ? 'bg-mint/20 text-ink' : 'bg-ink-10 text-ink-50'
                        }`}
                      >
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-ink-60">
                      <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      {s.email}
                    </p>
                    {assignmentLabels.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-40">Assigned events</p>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {assignmentLabels.map((label, i) => (
                            <li
                              key={`${s.id}-${i}`}
                              className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-ink ring-1 ring-ink-10"
                            >
                              {label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-3 text-[12px] text-ink-40">Not assigned to any live event.</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch xl:flex-row">
                    <Button
                      type="button"
                      variant="dark"
                      size="sm"
                      className="min-w-[140px]"
                      onClick={() => setEditTarget(s)}
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Edit account
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-w-[140px]"
                      onClick={() =>
                        onGoToAssignments(s.assignedEventIds.length === 1 ? s.assignedEventIds[0] : undefined)
                      }
                    >
                      Manage assignments
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="min-w-[140px]"
                      onClick={() => setDeleteTarget(s)}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Delete account
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ScannerEditDialog
        scanner={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={onChanged}
      />

      <ScannerConfirmDialog
        open={deleteTarget != null}
        title="Delete scanner account?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" (${deleteTarget.email}) will lose scanner app access. All event assignments and registered devices are revoked. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete account"
        loading={deleting}
        onCancel={() => !deleting && setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink-10 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-40">{label}</p>
      <p className="mt-1 font-mono text-[22px] font-bold leading-none text-ink">{value}</p>
    </div>
  );
}
