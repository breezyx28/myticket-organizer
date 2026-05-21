import { Button } from '@/components/ui/Button';
import { ScannerConfirmDialog } from '@/components/scanners/ScannerConfirmDialog';
import { ScannerEditDialog } from '@/components/scanners/ScannerEditDialog';
import {
  ScannerAvatar,
  ScannerChipList,
  ScannerEmptyState,
  ScannerPanelToolbar,
  ScannerStatusBadge,
} from '@/components/scanners/scannerUi';
import { deleteScanner } from '@/services/scannersService';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import { toast } from '@/lib/appToast';
import type { OrganizerEvent, ScannerAccount } from '@/types/domain';
import { Mail, Pencil, Trash2 } from 'lucide-react';
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
    <>
      <ScannerPanelToolbar
        title="Gate staff"
        description="Edit login details, enable or disable accounts, or remove staff entirely."
        action={
          <Button variant="outline" size="sm" onClick={onAddStaff} className="sm:hidden">
            Add staff
          </Button>
        }
      />

      {scanners.length === 0 ? (
        <ScannerEmptyState
          title="No gate staff yet"
          description="Create scanner accounts so your team can check in tickets at event entrances."
          action={
            <Button variant="dark" size="md" onClick={onAddStaff}>
              Add gate staff
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-ink-10 rounded-2xl border border-ink-10">
          {scanners.map((s) => {
            const assignmentLabels = s.assignedEventIds.map((id) => eventTitleById[id] ?? `Event #${id}`);
            return (
              <li key={s.id} className="flex flex-col gap-4 bg-white p-4 first:rounded-t-2xl last:rounded-b-2xl sm:flex-row sm:items-start sm:p-5">
                <div className="flex min-w-0 flex-1 gap-3">
                  <ScannerAvatar name={s.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-extrabold text-ink">{s.name}</p>
                      <ScannerStatusBadge active={s.active} />
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-[13px] text-ink-60">
                      <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      {s.email}
                    </p>
                    {assignmentLabels.length > 0 ? (
                      <div className="mt-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-40">Events</p>
                        <ScannerChipList items={assignmentLabels} />
                      </div>
                    ) : (
                      <p className="mt-2 text-[12px] text-ink-40">No live event assignments</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-ink-10 pt-3 sm:w-auto sm:flex-col sm:border-0 sm:pt-0 lg:min-w-[148px]">
                  <Button type="button" variant="dark" size="sm" className="flex-1 sm:flex-none" onClick={() => setEditTarget(s)}>
                    <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() =>
                      onGoToAssignments(s.assignedEventIds.length === 1 ? s.assignedEventIds[0] : undefined)
                    }
                  >
                    Assignments
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 border-coral/30 text-coral hover:bg-coral/10 sm:flex-none"
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ScannerEditDialog scanner={editTarget} onClose={() => setEditTarget(null)} onSaved={onChanged} />

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
    </>
  );
}
