import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ScannerResendCredentialsResultDialog } from '@/components/scanners/ScannerResendCredentialsDialog';
import {
  ScannerDialogOverlay,
  ScannerFormLabel,
  ScannerTemporaryPasswordAlert,
  scannerInputErrorClass,
} from '@/components/scanners/scannerUi';
import {
  applyScannerCredentialsOutcome,
  resendScannerCredentials,
  updateScanner,
} from '@/services/scannersService';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import { firstMessagesFromApiError, pickApiFieldMessage } from '@/lib/api/apiValidationErrors';
import { toast } from '@/lib/appToast';
import type { ScannerAccount } from '@/types/domain';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function ScannerEditDialog({
  scanner,
  onClose,
  onSaved,
}: {
  scanner: ScannerAccount | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useTranslation(['scanners', 'common']);
  const open = scanner != null;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [emailCredentials, setEmailCredentials] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [resendTempPassword, setResendTempPassword] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  useEffect(() => {
    if (!scanner) return;
    setName(scanner.name);
    setEmail(scanner.email);
    setPassword('');
    setIsActive(scanner.active);
    setEmailCredentials(false);
    setTemporaryPassword(null);
    setResendTempPassword(null);
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

  async function handleResendCredentials() {
    if (!scanner || resending || saving) return;
    setResending(true);
    try {
      const result = await resendScannerCredentials(scanner.id);
      const outcome = applyScannerCredentialsOutcome(result, setResendTempPassword);
      if (outcome === 'emailed') {
        toast.success(t('toasts.credentialsResentEmailed', { email: result.account.email }));
      } else if (outcome === 'silent') {
        toast.success(t('toasts.passwordGenerated'));
      }
      await onSaved();
    } catch (err) {
      toast.error(formatOrganizerApiError(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <ScannerDialogOverlay>
        <h3 className="text-xl font-extrabold text-ink">{t('edit.title')}</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-60">{t('edit.description')}</p>

        {temporaryPassword ? (
          <div className="mt-4">
            <ScannerTemporaryPasswordAlert password={temporaryPassword} />
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
            if (!nm) next.name = t('create.validation.nameRequired');
            if (!em) next.email = t('create.validation.emailRequired');
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) next.email = t('create.validation.emailInvalid');
            if (pw && pw.length < 8) next.password = t('create.validation.passwordMinLength');
            if (Object.keys(next).length > 0) {
              setFieldErrors(next);
              return;
            }

            const patch = buildPatchBody();
            if (Object.keys(patch).length === 0) {
              toast.error(t('edit.validation.changeAtLeastOne'));
              return;
            }

            setFieldErrors({});
            void (async () => {
              setSaving(true);
              try {
                const result = await updateScanner({ id: scanner.id, ...patch });
                const outcome = applyScannerCredentialsOutcome(result, setTemporaryPassword);
                if (outcome === 'emailed') {
                  toast.success(t('toasts.updatedCredentialsEmailed', { email: result.account.email }));
                  onClose();
                  await onSaved();
                } else if (outcome === 'temporary') {
                  await onSaved();
                } else {
                  toast.success(t('toasts.accountUpdated'));
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
            {t('create.fields.name')}
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
            {t('create.fields.email')}
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
            {t('edit.fields.newPassword')}
            <PasswordInput
              autoComplete="new-password"
              className={scannerInputErrorClass(Boolean(fieldErrors.password))}
              hasError={Boolean(fieldErrors.password)}
              value={password}
              placeholder={t('edit.fields.passwordPlaceholder')}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((c) => ({ ...c, password: undefined }));
              }}
            />
          </ScannerFormLabel>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-ink-10 bg-ink-5/25 px-3 py-3 text-[14px] text-ink">
            <input type="checkbox" className="h-4 w-4 rounded border-ink-20" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span>
              <span className="font-semibold">{t('edit.activeAccount.label')}</span>
              <span className="mt-0.5 block text-[12px] text-ink-50">{t('edit.activeAccount.hint')}</span>
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
              <span className="font-semibold">{t('edit.emailCredentials.label')}</span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-50">{t('edit.emailCredentials.hint')}</span>
            </span>
          </label>

          <div className="rounded-xl border border-dashed border-ink-20 bg-ink-5/20 px-3 py-3">
            <p className="text-[12px] font-semibold text-ink-60">{t('edit.resetLogin.title')}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-50">{t('edit.resetLogin.description')}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
              disabled={saving || resending}
              onClick={() => void handleResendCredentials()}
            >
              <Mail className="h-4 w-4" strokeWidth={2} aria-hidden />
              {resending ? t('sending', { ns: 'common' }) : t('edit.resetLogin.resend')}
            </Button>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-ink-10 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={saving || resending}>
              {temporaryPassword ? t('close', { ns: 'common' }) : t('cancel', { ns: 'common' })}
            </Button>
            <Button type="submit" variant="dark" size="md" disabled={saving || resending}>
              {saving ? t('saving', { ns: 'common' }) : t('save', { ns: 'common' })}
            </Button>
          </div>
        </form>
      </ScannerDialogOverlay>

      {resendTempPassword ? (
        <ScannerResendCredentialsResultDialog
          scannerName={scanner.name}
          email={scanner.email}
          temporaryPassword={resendTempPassword}
          onClose={() => setResendTempPassword(null)}
        />
      ) : null}
    </>
  );
}
