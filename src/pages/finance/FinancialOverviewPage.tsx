import { Button } from '@/components/ui/Button';
import {
  downloadFinanceCsv,
  getFinance,
  getFinanceExportsCsv,
  listBankAccountsForFinance,
  listPayoutsPageForFinance,
  type BankAccountRowView,
  type PayoutRowView,
} from '@/services/financeService';
import type { FinanceSnapshot } from '@/types/domain';
import { toast } from '@/lib/appToast';
import { formatDate, formatNumber } from '@/lib/locale/format';
import { useLocale } from '@/hooks/useLocale';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function FinancialOverviewPage() {
  const { t } = useTranslation(['finance', 'common']);
  const { language } = useLocale();
  const [f, setF] = useState<FinanceSnapshot | null>(null);
  const [banks, setBanks] = useState<BankAccountRowView[]>([]);
  const [payouts, setPayouts] = useState<PayoutRowView[]>([]);
  const [payoutMeta, setPayoutMeta] = useState<{ page: number; last: number; total: number } | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        const [fin, b, { rows, shell }] = await Promise.all([
          getFinance(),
          listBankAccountsForFinance(),
          listPayoutsPageForFinance(1),
        ]);
        setF(fin);
        setBanks(b);
        setPayouts(rows);
        setPayoutMeta(
          shell
            ? { page: shell.current_page, last: shell.last_page, total: shell.total }
            : null
        );
      })();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const onDownloadCsv = useCallback(async () => {
    setExportErr(null);
    setExportBusy(true);
    try {
      const csv = await getFinanceExportsCsv();
      downloadFinanceCsv(csv);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('errors.exportFailed');
      setExportErr(msg);
      toast.error(msg);
    } finally {
      setExportBusy(false);
    }
  }, []);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">{t('page.eyebrow')}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t('page.title')}</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-ink-60">{t('page.description')}</p>
        </div>
        <div className="flex flex-col items-start gap-2">
          <Button type="button" variant="outline" size="md" disabled={exportBusy} onClick={() => void onDownloadCsv()}>
            {exportBusy ? t('page.preparingExport') : t('page.downloadCsv')}
          </Button>
          {exportErr ? <p className="text-[12px] font-semibold text-coral">{exportErr}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Tile label={t('tiles.gross')} value={f ? `SAR ${formatNumber(f.gross, language)}` : '—'} />
        <Tile label={t('tiles.platformFees')} value={f ? `SAR ${formatNumber(f.platformFees, language)}` : '—'} />
        <Tile label={t('tiles.net')} value={f ? `SAR ${formatNumber(f.net, language)}` : '—'} accent="bg-mint/30" />
        <Tile label={t('tiles.refunds')} value={f ? `SAR ${formatNumber(f.refunds, language)}` : '—'} accent="bg-coral/15" />
        <Tile
          label={t('tiles.adjustments')}
          value={f != null && f.adjustments != null ? `SAR ${formatNumber(f.adjustments, language)}` : f ? 'SAR 0' : '—'}
          accent="bg-sky/25"
        />
      </div>

      <div className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-60">{t('payoutStatus.label')}</p>
        <p className="mt-2 inline-flex rounded-full bg-ink-5 px-4 py-2 text-[13px] font-bold uppercase text-ink-80 ring-1 ring-ink-10">
          {f?.payoutStatus ?? '—'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">{t('bankAccounts.title')}</h2>
          <p className="mt-1 text-[13px] text-ink-60">{t('bankAccounts.subtitle')}</p>
          <ul className="mt-4 divide-y divide-ink-10">
            {banks.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[13px]">
                <div>
                  <p className="font-semibold text-ink">
                    {b.bankName}
                    {b.isDefault ? (
                      <span className="ms-2 rounded-full bg-mint/25 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-80">
                        {t('bankAccounts.default')}
                      </span>
                    ) : null}
                  </p>
                  <p className="font-mono text-[12px] text-ink-60">{b.masked}</p>
                </div>
                <span className="text-[12px] text-ink-40">{b.currency}</span>
              </li>
            ))}
            {banks.length === 0 ? <li className="py-4 text-[13px] text-ink-40">{t('bankAccounts.empty')}</li> : null}
          </ul>
        </section>

        <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">{t('payouts.title')}</h2>
          <p className="mt-1 text-[13px] text-ink-60">
            {payoutMeta
              ? t('payouts.pageInfo', { page: payoutMeta.page, last: payoutMeta.last, total: payoutMeta.total })
              : t('payouts.firstPageHint')}
          </p>
          <ul className="mt-4 divide-y divide-ink-10">
            {payouts.map((p) => (
              <li key={p.id} className="grid gap-1 py-3 text-[13px] sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <span className="font-mono text-[12px] font-semibold text-ink">#{p.id}</span>
                <span className="rounded-full bg-ink-5 px-2 py-0.5 text-[11px] font-bold uppercase text-ink-60 ring-1 ring-ink-10">
                  {p.status}
                </span>
                <div className="flex flex-col items-start gap-0.5 sm:items-end">
                  <span className="font-mono font-bold text-ink">{p.amount}</span>
                  <span className="text-[11px] text-ink-40">
                    {p.at !== '—' && !Number.isNaN(new Date(p.at).getTime()) ? formatDate(p.at, language) : p.at}
                  </span>
                </div>
              </li>
            ))}
            {payouts.length === 0 ? <li className="py-4 text-[13px] text-ink-40">{t('payouts.empty')}</li> : null}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-ink-10 bg-surface-tint p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">{t('refundBreakdown.title')}</h2>
          <ul className="mt-3 space-y-2 text-[13px]">
            {f?.refundBreakdown?.map((item) => (
              <li key={item.reason} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="text-ink-60">{item.reason}</span>
                <span className="font-mono text-ink">SAR {formatNumber(item.amount, language)}</span>
              </li>
            ))}
            {!f?.refundBreakdown?.length ? <li className="text-ink-40">{t('refundBreakdown.empty')}</li> : null}
          </ul>
        </section>
        <section className="rounded-3xl border border-ink-10 bg-surface-tint p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">{t('adjustments.title')}</h2>
          <ul className="mt-3 space-y-2 text-[13px]">
            {f?.feeAdjustments?.map((item) => (
              <li key={item.label} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="text-ink-60">{item.label}</span>
                <span className="font-mono text-ink">
                  {item.amount < 0 ? '-' : '+'}SAR {formatNumber(Math.abs(item.amount), language)}
                </span>
              </li>
            ))}
            {!f?.feeAdjustments?.length ? <li className="text-ink-40">{t('adjustments.empty')}</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Tile({ label, value, accent = 'bg-white' }: { label: string; value: string; accent?: string }) {
  return (
    <div className={`rounded-3xl border border-ink-10 p-6 shadow-card-sm ${accent}`}>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-60">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
