import { getAuctionActivity, getBookingVelocity, getSalesByEvent, getSalesSummary, getTicketTypeDistribution } from '@/services/analyticsService';
import { BadgeDollarSign, CalendarClock, Ticket, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: '#FF6B5F',
  },
  sold: {
    label: 'Sold',
    color: '#4ECDC4',
  },
  remaining: {
    label: 'Remaining',
    color: '#D0D7E2',
  },
  active: {
    label: 'Active',
    color: '#7B8CFF',
  },
} satisfies ChartConfig;

export function SalesAnalyticsPage() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getSalesSummary>> | null>(null);
  const [velocity, setVelocity] = useState<Awaited<ReturnType<typeof getBookingVelocity>>>([]);
  const [byEvent, setByEvent] = useState<Awaited<ReturnType<typeof getSalesByEvent>>>([]);
  const [distribution, setDistribution] = useState<Awaited<ReturnType<typeof getTicketTypeDistribution>>>([]);
  const [auction, setAuction] = useState<Awaited<ReturnType<typeof getAuctionActivity>> | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        const [s, v, ev, dist, auc] = await Promise.all([
          getSalesSummary(),
          getBookingVelocity(),
          getSalesByEvent(),
          getTicketTypeDistribution(),
          getAuctionActivity(),
        ]);
        setSummary(s);
        setVelocity(v);
        setByEvent(ev);
        setDistribution(dist);
        setAuction(auc);
      })();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const avgOrderValue = useMemo(() => {
    if (velocity.length === 0) return 0;
    return Math.round(velocity.reduce((sum, item) => sum + item.amount, 0) / velocity.length);
  }, [velocity]);

  const trendData = useMemo(
    () =>
      [...velocity].reverse().map((item) => ({
        time: new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        revenue: item.amount,
      })),
    [velocity]
  );

  const eventChartData = useMemo(
    () =>
      byEvent.map((row) => ({
        name: row.eventTitle.length > 18 ? `${row.eventTitle.slice(0, 18)}…` : row.eventTitle,
        sold: row.sold,
        remaining: row.remaining,
      })),
    [byEvent]
  );

  const ticketMixData = useMemo(
    () =>
      distribution.map((d, idx) => ({
        type: d.label,
        qty: d.qty,
        fill: `hsl(${(idx * 70 + 8) % 360} 82% 58%)`,
      })),
    [distribution]
  );

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Analytics</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">Sales &amp; bookings</h1>
        <p className="mt-2 max-w-3xl text-[14px] text-ink-60">
          Powered by shadcn chart components + Recharts for clearer trend, distribution, and inventory insight.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Ticket className="h-4 w-4" />} label="Tickets sold" value={summary ? String(summary.totalTickets) : '—'} />
        <KpiCard icon={<BadgeDollarSign className="h-4 w-4" />} label="Gross revenue" value={summary ? `SAR ${summary.totalRevenue.toLocaleString()}` : '—'} />
        <KpiCard icon={<CalendarClock className="h-4 w-4" />} label="Live / upcoming events" value={summary ? String(summary.upcoming) : '—'} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Avg order value" value={velocity.length ? `SAR ${avgOrderValue.toLocaleString()}` : '—'} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <article className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">Revenue trend</h2>
          <p className="mt-1 text-[12px] text-ink-50">Recent booking value over time.</p>
          <ChartContainer config={chartConfig} className="mt-4 h-56 w-full">
            <AreaChart data={trendData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => [`SAR ${Number(value).toLocaleString()}`, 'Revenue']} />} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.22} strokeWidth={2.5} />
            </AreaChart>
          </ChartContainer>
        </article>

        <article className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">Ticket type mix</h2>
          <p className="mt-1 text-[12px] text-ink-50">Share of sold quantities by ticket type.</p>
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
        <h2 className="text-lg font-extrabold text-ink">Event inventory chart</h2>
        <p className="mt-1 text-[12px] text-ink-50">Compare sold and remaining capacity per event.</p>
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
        <h2 className="text-lg font-extrabold text-ink">Recent bookings</h2>
        <p className="mt-1 text-[12px] text-ink-50">Latest transactional data in table format.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-[12px]">
            <thead className="text-[11px] uppercase tracking-wide text-ink-40">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Buyer</th>
                <th className="px-3 py-2">Ticket type</th>
                <th className="px-3 py-2">Seat</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {velocity.map((b) => (
                <tr key={b.id} className="border-t border-ink-10">
                  <td className="px-3 py-2 font-mono text-ink-60">{new Date(b.at).toLocaleString()}</td>
                  <td className="max-w-[220px] truncate px-3 py-2 font-semibold text-ink">{b.eventTitle}</td>
                  <td className="px-3 py-2 text-ink-60">{b.buyerEmail}</td>
                  <td className="px-3 py-2 text-ink-60">{b.ticketType ?? '—'}</td>
                  <td className="px-3 py-2 text-ink-60">{b.seatRef ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-ink">{b.qty}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink">SAR {b.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {velocity.length === 0 ? <p className="mt-3 text-[13px] text-ink-40">No booking data yet.</p> : null}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <article className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">Per-event performance table</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-[12px]">
              <thead className="text-[11px] uppercase tracking-wide text-ink-40">
                <tr>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Sold</th>
                  <th className="px-3 py-2">Remaining</th>
                  <th className="px-3 py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {byEvent.map((row) => (
                  <tr key={row.eventId} className="border-t border-ink-10">
                    <td className="max-w-[250px] truncate px-3 py-2 font-semibold text-ink">{row.eventTitle}</td>
                    <td className="px-3 py-2 font-mono text-ink">{row.sold}</td>
                    <td className="px-3 py-2 font-mono text-ink">{row.remaining}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink">SAR {row.gross.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">Auction activity</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Active" value={auction ? String(auction.active) : '0'} />
            <MiniStat label="Sold" value={auction ? String(auction.sold) : '0'} />
            <MiniStat label="Expired" value={auction ? String(auction.expired) : '0'} />
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-ink-10">
            <table className="min-w-full text-left text-[11px]">
              <thead className="bg-ink-5/70 uppercase tracking-wide text-ink-40">
                <tr>
                  <th className="px-3 py-2">Listing</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Final</th>
                </tr>
              </thead>
              <tbody>
                {auction?.listings.map((item) => (
                  <tr key={item.id} className="border-t border-ink-10">
                    <td className="max-w-[160px] truncate px-3 py-2 font-semibold text-ink">{item.eventTitle}</td>
                    <td className="px-3 py-2 uppercase text-ink-60">{item.status}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink">
                      {item.finalPrice ? `SAR ${item.finalPrice.toLocaleString()}` : '—'}
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
