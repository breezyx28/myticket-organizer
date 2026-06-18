import { Button } from '@/components/ui/Button';
import { ScannerDialogOverlay, ScannerTemporaryPasswordAlert } from '@/components/scanners/scannerUi';
import { useTranslation } from 'react-i18next';

/** Shows temporary password when resend-credentials email failed. */
export function ScannerResendCredentialsResultDialog({
  scannerName,
  email,
  temporaryPassword,
  onClose,
}: {
  scannerName: string;
  email: string;
  temporaryPassword: string;
  onClose: () => void;
}) {
  const { t } = useTranslation(['scanners', 'common']);
  return (
    <ScannerDialogOverlay>
      <h3 className="text-lg font-extrabold text-ink">{t('resend.resultTitle')}</h3>
      <p className="mt-2 text-[14px] text-ink-60">
        {t('resend.resultDescription', { name: scannerName, email })}
      </p>
      <div className="mt-4">
        <ScannerTemporaryPasswordAlert password={temporaryPassword} />
      </div>
      <div className="mt-6 flex justify-end border-t border-ink-10 pt-4">
        <Button type="button" variant="dark" size="md" onClick={onClose}>
          {t('common:close')}
        </Button>
      </div>
    </ScannerDialogOverlay>
  );
}
