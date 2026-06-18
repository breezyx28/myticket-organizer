import { Button } from '@/components/ui/Button';
import { ScanLiveFeedStack } from '@/components/scanners/ScanLiveFeedStack';
import { ScanLiveStatsStrip } from '@/components/scanners/ScanLiveStatsStrip';
import { ScannerDialogOverlay } from '@/components/scanners/scannerUi';
import { useEventScanLive } from '@/hooks/useEventScanLive';
import { cn } from '@/lib/utils';
import { Radio, RefreshCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function LiveStatusPill({ connection }: { connection: ReturnType<typeof useEventScanLive>['connection'] }) {
  const { t } = useTranslation(['scanners', 'common']);
  const live = connection === 'live';
  const polling = connection === 'polling';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide',
        live && 'bg-mint/20 text-ink',
        polling && 'bg-amber/15 text-ink',
        connection === 'connecting' && 'bg-ink-5 text-ink-50',
        connection === 'error' && 'bg-coral/15 text-coral'
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          live ? 'scan-live-pulse bg-mint' : polling ? 'bg-amber' : 'bg-ink-30'
        )}
        aria-hidden
      />
      {live
        ? t('live.transport.live')
        : polling
          ? t('live.transport.polling')
          : connection === 'connecting'
            ? t('connecting', { ns: 'common' })
            : t('live.transport.reconnecting')}
    </span>
  );
}

export function ScanLiveDialog({
  open,
  eventId,
  eventTitle,
  onClose,
}: {
  open: boolean;
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}) {
  const { t } = useTranslation(['scanners', 'common']);
  const { rows, stats, connection, error, retry } = useEventScanLive(eventId, open);

  if (!open) return null;

  return (
    <ScannerDialogOverlay onBackdropClick={onClose} panelClassName="max-w-2xl">
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-ink-10 px-6 py-5 sm:px-8">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">{t('live.title')}</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-balance text-ink sm:text-2xl">
              {eventTitle}
            </h2>
            <p className="mt-1.5 text-[13px] text-ink-60">{t('live.subtitle')}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <LiveStatusPill connection={connection} />
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-ink-10 p-2 text-ink-60 transition-transform hover:bg-ink-5 active:scale-[0.96]"
              aria-label={t('close', { ns: 'common' })}
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <ScanLiveStatsStrip stats={stats} />

        {error ? (
          <div className="mx-6 mt-4 rounded-2xl border border-coral/25 bg-coral/10 px-4 py-3 text-[13px] text-ink sm:mx-8">
            <p className="font-semibold text-coral">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 active:scale-[0.96]"
              onClick={() => void retry()}
            >
              <RefreshCcw className="me-1.5 h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {t('retry', { ns: 'common' })}
            </Button>
          </div>
        ) : null}

        <div className="flex-1 overflow-hidden px-6 py-5 sm:px-8">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-50">
              <Radio className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {t('live.title')}
            </div>
            <span className="font-mono text-[11px] tabular-nums text-ink-40">{rows.length}</span>
          </div>
          <ScanLiveFeedStack rows={rows} eventTitle={eventTitle} activeScanners={stats.activeScanners} />
        </div>
      </div>
    </ScannerDialogOverlay>
  );
}
