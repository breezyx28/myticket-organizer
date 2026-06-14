import type { ScanLiveStats } from '@/types/domain';
import { cn } from '@/lib/utils';

function StatCell({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className={cn('min-w-[4.5rem] border-r border-ink-10 px-3 py-2 last:border-r-0', accent)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-40">{label}</p>
      <p className="mt-0.5 font-mono text-[18px] font-bold tabular-nums leading-none text-ink">{value}</p>
    </div>
  );
}

export function ScanLiveStatsStrip({ stats }: { stats: ScanLiveStats }) {
  return (
    <div className="overflow-x-auto border-y border-ink-10 bg-ink-5/30">
      <div className="flex min-w-max">
        <StatCell label="Total" value={stats.total} />
        <StatCell label="OK" value={stats.ok} accent="bg-mint/10" />
        <StatCell label="Dup" value={stats.duplicate} accent="bg-amber/10" />
        <StatCell label="Invalid" value={stats.invalid} />
        <StatCell label="Expired" value={stats.expired} />
        <StatCell label="Wrong" value={stats.wrong_event} />
        {stats.activeScanners != null ? (
          <StatCell label="Scanners" value={stats.activeScanners} />
        ) : null}
      </div>
    </div>
  );
}
