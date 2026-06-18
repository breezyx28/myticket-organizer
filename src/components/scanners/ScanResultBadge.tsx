import type { ScanResult } from '@/types/domain';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const RESULT_STYLES: Record<ScanResult, { className: string }> = {
  ok: { className: 'bg-mint/25 text-ink' },
  duplicate: { className: 'bg-amber/20 text-ink' },
  invalid: { className: 'bg-coral/15 text-coral' },
  expired: { className: 'bg-coral/15 text-coral' },
  wrong_event: { className: 'bg-coral/15 text-coral' },
};

export function ScanResultBadge({ result }: { result: ScanResult }) {
  const { t } = useTranslation('scanners');
  const style = RESULT_STYLES[result] ?? RESULT_STYLES.invalid;
  return (
    <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', style.className)}>
      {t(`results.${result}`)}
    </span>
  );
}
