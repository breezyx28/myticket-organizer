import { getSalesAnalytics, type SalesAnalyticsPayload } from '@/services/analyticsService';
import { BadgeDollarSign, CalendarClock, Ticket, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useLocale } from '@/hooks/useLocale';
import { formatDateTime, formatNumber } from '@/lib/locale/format';
import { useTranslation } from 'react-i18next';

export function SalesAnalyticsPage() {
  const { t } = useTranslation('analytics');
  const { language } = useLocale();
  const [sales, setSales] = useState<SalesAnalyticsPayload | null>(null);

  const chartConfig = useMemo(
    () =>
      ({
        revenue: {
          label: t('sales.charts.revenueTrend.revenueLabel'),
          color: '#FF6B5F',
        },
        sold: {
          label: t('sales.charts.eventInventory.sold'),
          color: '#4ECDC4',
        },
        remaining: {
          label: t('sales.charts.eventInventory.remaining'),
          color: '#D0D7E2',
        },
        active: {
          label: t('sales.auction.stats.active'),
          color: '#7B8CFF',
        },
      }) satisfies ChartConfig,
    [t]
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        const res = await getSalesAnalytics();
        setSales(res.data);
      })();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const avgOrderValue = sales?.summary.avg_order_value ?? 0;

  const trendData = useMemo(
    () => (sales?.revenue_trend ?? []).map((item) => ({ time: item.label, revenue: item.revenue })),
    [sales]
  );

  const eventChartData = useMemo(
    () =>
      (sales?.event_inventory ?? []).map((row) => ({
        name: row.event_title.length > 18 ? `${row.event_title.slice(0, 18)}…` : row.event_title,
        sold: row.sold,
        remaining: row.remaining,
      })),
    [sales]
  );

  const ticketMixData = useMemo(
    () =>
      (sales?.ticket_type_mix ?? []).map((d, idx) => ({
        type: d.label,
        qty: d.qty,
        fill: `hsl(${(idx * 70 + 8) % 360} 82% 58%)`,
      })),
    [sales]
  );

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">{t('sales.eyebrow')}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{t('sales.title')}</h1>
        <p className="mt-2 max-w-3xl text-[14px] text-ink-60">{t('sales.description')}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Ticket className="h-4 w-4" />} label={t('sales.kpi.ticketsSold')} value={sales ? String(sales.summary.total_tickets_sold) : '—'} />
        <KpiCard icon={<BadgeDollarSign className="h-4 w-4" />} label={t('sales.kpi.grossRevenue')} value={sales ? `SAR ${formatNumber(sales.summary.total_revenue_gross, language)}` : '—'} />
        <KpiCard icon={<CalendarClock className="h-4 w-4" />} label={t('sales.kpi.liveUpcoming')} value={sales ? String(sales.summary.live_or_upcoming_events) : '—'} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label={t('sales.kpi.avgOrderValue')} value={sales ? `SAR ${formatNumber(avgOrderValue, language)}` : '—'} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <article className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">{t('sales.charts.revenueTrend.title')}</h2>
          <p className="mt-1 text-[12px] text-ink-50">{t('sales.charts.revenueTrend.subtitle')}</p>
          <ChartContainer config={chartConfig} className="mt-4 h-56 w-full">
            <AreaChart data={trendData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => [`SAR ${formatNumber(Number(value), language)}`, t('sales.charts.revenueTrend.revenueLabel')]} />} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.22} strokeWidth={2.5} />
            </AreaChart>
          </ChartContainer>
        </article>

        <article className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">{t('sales.charts.ticketMix.title')}</h2>
          <p className="mt-1 text-[12px] text-ink-50">{t('sales.charts.ticketMix.subtitle')}</p>
          <ChartContainer config={chartConfig} className="mt-4 h-56 w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="type" />} />
              <Pie data={ticketMixData} dataKey="qty" nameKey="type" innerRadius={52} outerRadius={84} paddingAngle={3} />
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        </article>
      </section>

      <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold text-ink">{t('sales.charts.eventInventory.title')}</h2>
        <p className="mt-1 text-[12px] text-ink-50">{t('sales.charts.eventInventory.subtitle')}</p>
        <ChartContainer config={chartConfig} className="mt-4 h-64 w-full">
          <BarChart data={eventChartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="sold" stackId="inv" fill="var(--color-sold)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="remaining" stackId="inv" fill="var(--color-remaining)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </section>

      <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold text-ink">{t('sales.recentBookings.title')}</h2>
        <p className="mt-1 text-[12px] text-ink-50">{t('sales.recentBookings.subtitle')}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-start text-[12px]">
            <thead className="text-[11px] uppercase tracking-wide text-ink-40">
              <tr>
                <th className="px-3 py-2">{t('sales.recentBookings.table.time')}</th>
                <th className="px-3 py-2">{t('sales.recentBookings.table.event')}</th>
                <th className="px-3 py-2">{t('sales.recentBookings.table.buyer')}</th>
                <th className="px-3 py-2">{t('sales.recentBookings.table.ticketType')}</th>
                <th className="px-3 py-2">{t('sales.recentBookings.table.seat')}</th>
                <th className="px-3 py-2">{t('sales.recentBookings.table.qty')}</th>
                <th className="px-3 py-2 text-end">{t('sales.recentBookings.table.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {(sales?.recent_bookings ?? []).map((b) => (
                <tr key={b.id} className="border-t border-ink-10">
                  <td className="px-3 py-2 font-mono text-ink-60">{formatDateTime(b.at, language)}</td>
                  <td className="max-w-[220px] truncate px-3 py-2 font-semibold text-ink">{b.event_title}</td>
                  <td className="px-3 py-2 text-ink-60">{b.buyer_email}</td>
                  <td className="px-3 py-2 text-ink-60">{b.ticket_type ?? '—'}</td>
                  <td className="px-3 py-2 text-ink-60">{b.seat_ref ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-ink">{b.qty}</td>
                  <td className="px-3 py-2 text-end font-mono text-ink">SAR {formatNumber(b.amount, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(sales?.recent_bookings?.length ?? 0) === 0 ? <p className="mt-3 text-[13px] text-ink-40">{t('sales.recentBookings.empty')}</p> : null}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <article className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">{t('sales.eventPerformance.title')}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-start text-[12px]">
              <thead className="text-[11px] uppercase tracking-wide text-ink-40">
                <tr>
                  <th className="px-3 py-2">{t('sales.eventPerformance.table.event')}</th>
                  <th className="px-3 py-2">{t('sales.eventPerformance.table.sold')}</th>
                  <th className="px-3 py-2">{t('sales.eventPerformance.table.remaining')}</th>
                  <th className="px-3 py-2 text-end">{t('sales.eventPerformance.table.revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {(sales?.event_inventory ?? []).map((row) => (
                  <tr key={row.event_id} className="border-t border-ink-10">
                    <td className="max-w-[250px] truncate px-3 py-2 font-semibold text-ink">{row.event_title}</td>
                    <td className="px-3 py-2 font-mono text-ink">{row.sold}</td>
                    <td className="px-3 py-2 font-mono text-ink">{row.remaining}</td>
                    <td className="px-3 py-2 text-end font-mono text-ink">SAR {formatNumber(row.gross, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">{t('sales.auction.title')}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <MiniStat label={t('sales.auction.stats.active')} value={sales ? String(sales.auction_activity.active) : '0'} />
            <MiniStat label={t('sales.auction.stats.sold')} value={sales ? String(sales.auction_activity.sold) : '0'} />
            <MiniStat label={t('sales.auction.stats.expired')} value={sales ? String(sales.auction_activity.expired) : '0'} />
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-ink-10">
            <table className="min-w-full text-start text-[11px]">
              <thead className="bg-ink-5/70 uppercase tracking-wide text-ink-40">
                <tr>
                  <th className="px-3 py-2">{t('sales.auction.table.listing')}</th>
                  <th className="px-3 py-2">{t('sales.auction.table.status')}</th>
                  <th className="px-3 py-2 text-end">{t('sales.auction.table.final')}</th>
                </tr>
              </thead>
              <tbody>
                {(sales?.auction_activity.listings ?? []).map((item) => (
                  <tr key={item.id} className="border-t border-ink-10">
                    <td className="max-w-[160px] truncate px-3 py-2 font-semibold text-ink">{item.event_title || item.code || item.id}</td>
                    <td className="px-3 py-2 uppercase text-ink-60">{item.status}</td>
                    <td className="px-3 py-2 text-end font-mono text-ink">
                      {item.final_price != null
                        ? `SAR ${formatNumber(item.final_price, language)}`
                          : item.price != null
                          ? `SAR ${formatNumber(item.price, language)}`
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-3xl border border-ink-10 bg-white p-5 shadow-card-sm">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-50">
        {icon}
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-ink">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-10 bg-ink-5/40 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase text-ink-40">{label}</p>
      <p className="mt-1 font-mono text-[14px] font-bold text-ink">{value}</p>
    </div>
  );
}
