import { Button } from '@/components/ui/Button';
import { ScannerDialogOverlay, ScannerTemporaryPasswordAlert } from '@/components/scanners/scannerUi';

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
  return (
    <ScannerDialogOverlay>
      <h3 className="text-lg font-extrabold text-ink">New login password</h3>
      <p className="mt-2 text-[14px] text-ink-60">
        A new password was generated for <strong className="font-semibold text-ink">{scannerName}</strong> ({email})
        but the email could not be delivered.
      </p>
      <div className="mt-4">
        <ScannerTemporaryPasswordAlert password={temporaryPassword} />
      </div>
      <div className="mt-6 flex justify-end border-t border-ink-10 pt-4">
        <Button type="button" variant="dark" size="md" onClick={onClose}>
          Done
        </Button>
      </div>
    </ScannerDialogOverlay>
  );
}
