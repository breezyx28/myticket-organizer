import { Button } from '@/components/ui/Button';
import { ScannerConfirmDialog } from '@/components/scanners/ScannerConfirmDialog';
import { ScannerEditDialog } from '@/components/scanners/ScannerEditDialog';
import { ScannerResendCredentialsResultDialog } from '@/components/scanners/ScannerResendCredentialsDialog';
import {
  ScannerAvatar,
  ScannerChipList,
  ScannerEmptyState,
  ScannerPanelToolbar,
  ScannerStatusBadge,
} from '@/components/scanners/scannerUi';
import {
  applyScannerCredentialsOutcome,
  deleteScanner,
  resendScannerCredentials,
} from '@/services/scannersService';
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
  const [resendTarget, setResendTarget] = useState<ScannerAccount | null>(null);
  const [resendTempPassword, setResendTempPassword] = useState<{ scanner: ScannerAccount; password: string } | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [resending, setResending] = useState(false);

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

  async function confirmResend() {
    if (!resendTarget) return;
    setResending(true);
    try {
      const result = await resendScannerCredentials(resendTarget.id);
      const outcome = applyScannerCredentialsOutcome(result, (password) => {
        setResendTempPassword({ scanner: resendTarget, password });
      });
      if (outcome === 'emailed') {
        toast.success(`New login details were emailed to ${result.account.email}.`);
      } else if (outcome === 'silent') {
        toast.success('New password generated.');
      }
      setResendTarget(null);
      await onChanged();
    } catch (err) {
      toast.error(formatOrganizerApiError(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <ScannerPanelToolbar
        title="Gate staff"
        description="Edit accounts, resend login emails, or remove staff. Resend generates a new password and emails scanner app login details."
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

                <div className="grid grid-cols-2 gap-2 border-t border-ink-10 pt-3 sm:w-auto sm:min-w-[200px] sm:border-0 sm:pt-0 lg:min-w-[220px]">
                  <Button type="button" variant="dark" size="sm" onClick={() => setEditTarget(s)}>
                    <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Edit
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setResendTarget(s)}>
                    <Mail className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Resend creds
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
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
                    className="border-coral/30 text-coral hover:bg-coral/10"
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
        open={resendTarget != null}
        title="Resend login credentials?"
        description={
          resendTarget
            ? `Generate a new password and email login details to ${resendTarget.email}? Assigned gate and event names are included when present.`
            : ''
        }
        confirmLabel="Resend credentials"
        loading={resending}
        onCancel={() => !resending && setResendTarget(null)}
        onConfirm={() => void confirmResend()}
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

      {resendTempPassword ? (
        <ScannerResendCredentialsResultDialog
          scannerName={resendTempPassword.scanner.name}
          email={resendTempPassword.scanner.email}
          temporaryPassword={resendTempPassword.password}
          onClose={() => setResendTempPassword(null)}
        />
      ) : null}
    </>
  );
}
