import { getFinance } from '@/services/financeService';
import type { FinanceSnapshot } from '@/types/domain';
import { useEffect, useState } from 'react';

export function FinancialOverviewPage() {
  const [f, setF] = useState<FinanceSnapshot | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void getFinance().then(setF);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Finance</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Financial overview</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-60">Gross, platform fees, net, refunds, and payout status (mock).</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Tile label="Gross" value={f ? `SAR ${f.gross.toLocaleString()}` : '—'} />
        <Tile label="Platform fees" value={f ? `SAR ${f.platformFees.toLocaleString()}` : '—'} />
        <Tile label="Net" value={f ? `SAR ${f.net.toLocaleString()}` : '—'} accent="bg-mint/30" />
        <Tile label="Refunds" value={f ? `SAR ${f.refunds.toLocaleString()}` : '—'} accent="bg-coral/15" />
      </div>

      <div className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-60">Payout status</p>
        <p className="mt-2 inline-flex rounded-full bg-ink-5 px-4 py-2 text-[13px] font-bold uppercase text-ink-80 ring-1 ring-ink-10">
          {f?.payoutStatus ?? '—'}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-ink-10 bg-surface-tint p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">Refund breakdown</h2>
          <ul className="mt-3 space-y-2 text-[13px]">
            {f?.refundBreakdown?.map((item) => (
              <li key={item.reason} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="text-ink-60">{item.reason}</span>
                <span className="font-mono text-ink">SAR {item.amount.toLocaleString()}</span>
              </li>
            ))}
            {!f?.refundBreakdown?.length ? <li className="text-ink-40">No refund line items.</li> : null}
          </ul>
        </section>
        <section className="rounded-3xl border border-ink-10 bg-surface-tint p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">Fee adjustments</h2>
          <ul className="mt-3 space-y-2 text-[13px]">
            {f?.feeAdjustments?.map((item) => (
              <li key={item.label} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                <span className="text-ink-60">{item.label}</span>
                <span className="font-mono text-ink">{item.amount < 0 ? '-' : '+'}SAR {Math.abs(item.amount).toLocaleString()}</span>
              </li>
            ))}
            {!f?.feeAdjustments?.length ? <li className="text-ink-40">No fee adjustments.</li> : null}
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
