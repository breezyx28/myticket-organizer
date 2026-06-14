import type { ScanResult } from '@/types/domain';
import { cn } from '@/lib/utils';

const RESULT_STYLES: Record<ScanResult, { label: string; className: string }> = {
  ok: { label: 'OK', className: 'bg-mint/25 text-ink' },
  duplicate: { label: 'Duplicate', className: 'bg-amber/20 text-ink' },
  invalid: { label: 'Invalid', className: 'bg-coral/15 text-coral' },
  expired: { label: 'Expired', className: 'bg-coral/15 text-coral' },
  wrong_event: { label: 'Wrong event', className: 'bg-coral/15 text-coral' },
};

export function ScanResultBadge({ result }: { result: ScanResult }) {
  const style = RESULT_STYLES[result] ?? RESULT_STYLES.invalid;
  return (
    <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', style.className)}>
      {style.label}
    </span>
  );
}
