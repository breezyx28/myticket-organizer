import { Button } from '@/components/ui/Button';
import { ScannerDialogOverlay } from '@/components/scanners/scannerUi';
import { AlertTriangle } from 'lucide-react';

export function ScannerConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <ScannerDialogOverlay>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scanner-confirm-title"
        className="flex gap-3"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-coral/15 text-coral">
          <AlertTriangle size={22} strokeWidth={2} aria-hidden />
        </span>
        <div>
          <h2 id="scanner-confirm-title" className="text-lg font-extrabold text-ink">
            {title}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-60">{description}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-ink-10 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="md" className="sm:min-w-[100px]" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="button" variant="danger" size="md" className="sm:min-w-[140px]" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </ScannerDialogOverlay>
  );
}
