import type { ScanLiveStats } from '@/types/domain';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

function StatCell({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className={cn('min-w-[4.5rem] border-e border-ink-10 px-3 py-2 last:border-e-0', accent)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-40">{label}</p>
      <p className="mt-0.5 font-mono text-[18px] font-bold tabular-nums leading-none text-ink">{value}</p>
    </div>
  );
}

export function ScanLiveStatsStrip({ stats }: { stats: ScanLiveStats }) {
  const { t } = useTranslation('scanners');

  return (
    <div className="overflow-x-auto border-y border-ink-10 bg-ink-5/30">
      <div className="flex min-w-max">
        <StatCell label={t('live.stats.total')} value={stats.total} />
        <StatCell label={t('live.stats.ok')} value={stats.ok} accent="bg-mint/10" />
        <StatCell label={t('live.stats.duplicate')} value={stats.duplicate} accent="bg-amber/10" />
        <StatCell label={t('live.stats.invalid')} value={stats.invalid} />
        <StatCell label={t('live.stats.expired')} value={stats.expired} />
        <StatCell label={t('live.stats.wrong_event')} value={stats.wrong_event} />
        {stats.activeScanners != null ? <StatCell label={t('metrics.scanners')} value={stats.activeScanners} /> : null}
      </div>
    </div>
  );
}
