import { Button } from '@/components/ui/Button';
import { getSalesSummary, getBookingVelocity } from '@/services/analyticsService';
import { listScanLogs } from '@/services/scannersService';
import { CalendarPlus, QrCode, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function HomePage() {
  const [metrics, setMetrics] = useState<{ totalTickets: number; totalRevenue: number; upcoming: number; eventCount: number } | null>(
    null
  );
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof getBookingVelocity>>>([]);
  const [scans, setScans] = useState<Awaited<ReturnType<typeof listScanLogs>>>([]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        const [m, b, s] = await Promise.all([getSalesSummary(), getBookingVelocity(), listScanLogs()]);
        setMetrics(m);
        setBookings(b);
        setScans(s.slice(-5).reverse());
      })();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Dashboard</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">At a glance</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-60">Mock data in your browser reflects local changes to events, scanners, analytics, and finance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total events" value={metrics != null ? String(metrics.eventCount) : '—'} accent="bg-sky/30" />
        <Stat label="Tickets sold" value={metrics != null ? String(metrics.totalTickets) : '—'} accent="bg-lime/30" />
        <Stat label="Revenue (gross)" value={metrics != null ? `SAR ${metrics.totalRevenue.toLocaleString()}` : '—'} accent="bg-lemon/40" />
        <Stat label="Upcoming live" value={metrics != null ? String(metrics.upcoming) : '—'} accent="bg-mint/30" />
      </div>

      <div className="rounded-3xl border border-ink-10 bg-ink p-8 text-white shadow-card-lg">
        <h2 className="text-lg font-extrabold">Quick actions</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/events/new">
            <Button variant="primary" size="md" className="gap-2">
              <CalendarPlus size={18} strokeWidth={2} />
              Create event
            </Button>
          </Link>
          <Link to="/events">
            <Button variant="outline" size="md" className="gap-2 border-white/40 bg-white/10 text-white hover:bg-white/20">
              <Ticket size={18} strokeWidth={2} />
              View my events
            </Button>
          </Link>
          <Link to="/scanners">
            <Button variant="outline" size="md" className="gap-2 border-white/40 bg-white/10 text-white hover:bg-white/20">
              <QrCode size={18} strokeWidth={2} />
              Manage scanners
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h3 className="text-lg font-extrabold text-ink">Recent bookings</h3>
          <ul className="mt-4 space-y-3">
            {bookings.map((b) => (
              <li key={b.id} className="flex items-start justify-between gap-3 rounded-2xl border border-ink-10 bg-ink-5/40 px-4 py-3">
                <div>
                  <p className="text-[14px] font-bold text-ink">{b.eventTitle}</p>
                  <p className="text-[12px] text-ink-60">{b.buyerEmail}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[14px] font-bold text-ink">SAR {b.amount}</p>
                  <p className="text-[11px] text-ink-40">{new Date(b.at).toLocaleString()}</p>
                </div>
              </li>
            ))}
            {bookings.length === 0 ? <li className="text-[13px] text-ink-40">No bookings yet.</li> : null}
          </ul>
        </section>

        <section className="rounded-3xl border border-ink-10 bg-surface-tint p-6 shadow-card-sm">
          <h3 className="text-lg font-extrabold text-ink">Marketplace &amp; hiring</h3>
          <p className="mt-2 text-[14px] text-ink-60">
            Talent and vendor discovery, chat, and hiring live on the main website. Use this dashboard for events, scanners, analytics, and finance.
          </p>
          <a
            href="https://myticket.com/marketplace"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-ink-80"
          >
            Open marketplace on main site
          </a>
        </section>
      </div>

      <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
        <h3 className="text-lg font-extrabold text-ink">Recent scanner activity</h3>
        <ul className="mt-4 divide-y divide-ink-10">
          {scans.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[13px]">
              <span className="font-mono font-semibold text-ink">{l.ticketRef}</span>
              <span className="rounded-full bg-ink-5 px-3 py-1 text-[11px] font-bold uppercase text-ink-60">{l.result}</span>
              <span className="text-ink-40">{new Date(l.at).toLocaleString()}</span>
            </li>
          ))}
          {scans.length === 0 ? <li className="py-4 text-[13px] text-ink-40">No scans recorded.</li> : null}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`rounded-3xl border border-ink-10 p-6 shadow-card-sm ${accent}`}>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-60">{label}</p>
      <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-ink">{value}</p>
    </div>
  );
}
