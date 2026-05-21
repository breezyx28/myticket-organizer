import { Button } from '@/components/ui/Button';
import {
  ScannerDialogOverlay,
  ScannerFormLabel,
  scannerInputErrorClass,
} from '@/components/scanners/scannerUi';
import { updateScanner } from '@/services/scannersService';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import { firstMessagesFromApiError, pickApiFieldMessage } from '@/lib/api/apiValidationErrors';
import { toast } from '@/lib/appToast';
import type { ScannerAccount } from '@/types/domain';
import { useEffect, useState } from 'react';

export function ScannerEditDialog({
  scanner,
  onClose,
  onSaved,
}: {
  scanner: ScannerAccount | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const open = scanner != null;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [emailCredentials, setEmailCredentials] = useState(false);
  const [saving, setSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  useEffect(() => {
    if (!scanner) return;
    setName(scanner.name);
    setEmail(scanner.email);
    setPassword('');
    setIsActive(scanner.active);
    setEmailCredentials(false);
    setTemporaryPassword(null);
    setFieldErrors({});
  }, [scanner]);

  if (!open || !scanner) return null;

  function buildPatchBody() {
    const body: {
      name?: string;
      email?: string;
      password?: string;
      isActive?: boolean;
      emailCredentials?: boolean;
    } = {};
    const nm = name.trim();
    const em = email.trim();
    const pw = password.trim();
    if (nm !== scanner!.name) body.name = nm;
    if (em !== scanner!.email) body.email = em;
    if (pw) body.password = pw;
    if (isActive !== scanner!.active) body.isActive = isActive;
    if (emailCredentials) body.emailCredentials = true;
    return body;
  }

  return (
    <ScannerDialogOverlay>
      <h3 className="text-xl font-extrabold text-ink">Edit gate staff</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-60">
        Update display name, login email, password, or account status. Send at least one change.
      </p>

      {temporaryPassword ? (
        <div className="mt-4 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3 text-[13px] text-ink">
          <p className="font-bold">Email could not be sent</p>
          <p className="mt-1 text-ink-60">Share this temporary password with the staff member securely:</p>
          <p className="mt-2 font-mono text-[15px] font-bold text-ink">{temporaryPassword}</p>
        </div>
      ) : null}

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const next: { name?: string; email?: string; password?: string } = {};
          const nm = name.trim();
          const em = email.trim();
          const pw = password.trim();
          if (!nm) next.name = 'Name is required.';
          if (!em) next.email = 'Email is required.';
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) next.email = 'Enter a valid email address.';
          if (pw && pw.length < 8) next.password = 'Password must be at least 8 characters.';
          if (Object.keys(next).length > 0) {
            setFieldErrors(next);
            return;
          }

          const patch = buildPatchBody();
          if (Object.keys(patch).length === 0) {
            toast.error('Change at least one field before saving.');
            return;
          }

          setFieldErrors({});
          void (async () => {
            setSaving(true);
            try {
              const result = await updateScanner({ id: scanner.id, ...patch });
              if (result.credentialsEmailed) {
                toast.success(`Updated login details were emailed to ${result.account.email}.`);
                onClose();
                await onSaved();
              } else if (result.temporaryPassword) {
                setTemporaryPassword(result.temporaryPassword);
                await onSaved();
              } else {
                toast.success('Scanner account updated.');
                onClose();
                await onSaved();
              }
            } catch (err) {
              const raw = firstMessagesFromApiError(err);
              const fe: { name?: string; email?: string; password?: string } = {};
              const nErr = pickApiFieldMessage(raw, 'name');
              const eErr = pickApiFieldMessage(raw, 'email');
              const pErr = pickApiFieldMessage(raw, 'password');
              if (nErr) fe.name = nErr;
              if (eErr) fe.email = eErr;
              if (pErr) fe.password = pErr;
              setFieldErrors(fe);
              if (!fe.name && !fe.email && !fe.password) {
                toast.error(formatOrganizerApiError(err));
              }
            } finally {
              setSaving(false);
            }
          })();
        }}
      >
        <ScannerFormLabel error={fieldErrors.name}>
          Name
          <input
            className={scannerInputErrorClass(Boolean(fieldErrors.name))}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFieldErrors((c) => ({ ...c, name: undefined }));
            }}
          />
        </ScannerFormLabel>

        <ScannerFormLabel error={fieldErrors.email}>
          Email (scanner app login)
          <input
            type="email"
            className={scannerInputErrorClass(Boolean(fieldErrors.email))}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((c) => ({ ...c, email: undefined }));
            }}
          />
        </ScannerFormLabel>

        <ScannerFormLabel error={fieldErrors.password}>
          New password (optional)
          <input
            type="password"
            autoComplete="new-password"
            className={scannerInputErrorClass(Boolean(fieldErrors.password))}
            value={password}
            placeholder="Leave blank to keep current password"
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((c) => ({ ...c, password: undefined }));
            }}
          />
        </ScannerFormLabel>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-ink-10 bg-ink-5/25 px-3 py-3 text-[14px] text-ink">
          <input type="checkbox" className="h-4 w-4 rounded border-ink-20" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span>
            <span className="font-semibold">Active account</span>
            <span className="mt-0.5 block text-[12px] text-ink-50">Inactive staff cannot be assigned to events.</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-ink-10 px-3 py-3 text-[14px] text-ink">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-ink-20"
            checked={emailCredentials}
            onChange={(e) => setEmailCredentials(e.target.checked)}
          />
          <span>
            <span className="font-semibold">Email login credentials</span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-50">
              Sends email with login URL and password. If password is empty above, the server generates one.
            </span>
          </span>
        </label>

        <div className="flex flex-col-reverse gap-2 border-t border-ink-10 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={saving}>
            {temporaryPassword ? 'Close' : 'Cancel'}
          </Button>
          <Button type="submit" variant="dark" size="md" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </ScannerDialogOverlay>
  );
}
