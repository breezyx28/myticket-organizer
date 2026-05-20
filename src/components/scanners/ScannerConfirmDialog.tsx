import { Button } from '@/components/ui/Button';
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
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-confirm-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-ink-10 bg-white p-6 shadow-card-xl">
        <div className="flex gap-3">
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
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="md" className="sm:min-w-[100px]" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="danger" size="md" className="sm:min-w-[140px]" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
