import { formatScanFailureReason } from '@/lib/api/mapScanLive';
import type { ScanLiveRow } from '@/types/domain';
import { ScanResultBadge } from '@/components/scanners/ScanResultBadge';
import { useLocale } from '@/hooks/useLocale';
import { formatTime } from '@/lib/locale/format';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function ScanLiveFeedItem({
  row,
  eventTitle,
  enterDelayMs = 0,
}: {
  row: ScanLiveRow;
  eventTitle: string;
  enterDelayMs?: number;
}) {
  const { language } = useLocale();
  const { t } = useTranslation('scanners');

  return (
    <li
      className="scan-live-enter rounded-2xl border border-ink-10 bg-white px-4 py-3.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)]"
      style={{ animationDelay: `${enterDelayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ScanResultBadge result={row.result} />
            <span className="truncate font-mono text-[13px] font-semibold tabular-nums text-ink">
              {row.ticketRef || '—'}
            </span>
          </div>
          <p className="mt-1.5 truncate text-[13px] font-semibold text-ink">
            {row.scannerName || t('live.scannerFallback', { id: row.scannerId || '—' })}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-ink-50">{eventTitle}</p>
          {row.failureReason ? (
            <p className="mt-1.5 text-[12px] leading-snug text-coral">
              {formatScanFailureReason(row.failureReason)}
            </p>
          ) : null}
        </div>
        <time className={cn('shrink-0 text-[11px] tabular-nums text-ink-40')} dateTime={row.at}>
          {formatTime(row.at, language)}
        </time>
      </div>
    </li>
  );
}
