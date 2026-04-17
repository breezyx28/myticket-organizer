import { loadState } from '@/services/organizerStore';

const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

export async function getSalesSummary() {
  await delay();
  const s = loadState();
  const totalTickets = s.events.reduce((a, e) => a + e.ticketsSold, 0);
  const totalRevenue = s.events.reduce((a, e) => a + e.revenueGross, 0);
  const upcoming = s.events.filter((e) => e.status === 'published' || e.status === 'sold_out').length;
  return { totalTickets, totalRevenue, upcoming, eventCount: s.events.length };
}

export async function getBookingVelocity() {
  await delay();
  const bookings = [...loadState().bookings].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 12);
  return bookings;
}

export async function getSalesByEvent() {
  await delay();
  const s = loadState();
  return s.events.map((e) => {
    const bookings = s.bookings.filter((b) => b.eventId === e.id);
    const typeRevenue: Record<string, number> = {};
    bookings.forEach((b) => {
      const key = b.ticketType ?? 'Unspecified';
      typeRevenue[key] = (typeRevenue[key] ?? 0) + b.amount;
    });
    const remaining = Math.max(0, e.capacity - e.ticketsSold);
    return {
      eventId: e.id,
      eventTitle: e.title,
      sold: e.ticketsSold,
      remaining,
      gross: e.revenueGross,
      byType: typeRevenue,
    };
  });
}

export async function getTicketTypeDistribution() {
  await delay();
  const dist: Record<string, number> = {};
  loadState()
    .bookings.forEach((b) => {
      const k = b.ticketType ?? 'Unspecified';
      dist[k] = (dist[k] ?? 0) + b.qty;
    });
  return Object.entries(dist).map(([label, qty]) => ({ label, qty }));
}

export async function getAuctionActivity() {
  await delay();
  const auctions = loadState().auctions ?? [];
  return {
    active: auctions.filter((a) => a.status === 'active').length,
    sold: auctions.filter((a) => a.status === 'sold').length,
    expired: auctions.filter((a) => a.status === 'expired').length,
    listings: auctions,
  };
}

export async function getAttendanceSummary() {
  await delay();
  const s = loadState();
  const sold = s.events.reduce((a, e) => a + e.ticketsSold, 0);
  const scansOk = s.scanLogs.filter((l) => l.result === 'ok').length;
  const noShow = Math.max(0, sold - scansOk);
  return { sold, scansOk, noShow, recent: s.scanLogs.slice(-20).reverse() };
}

export async function getAttendanceByEvent(eventId?: string) {
  await delay();
  const s = loadState();
  const events = eventId ? s.events.filter((e) => e.id === eventId) : s.events;
  const sold = events.reduce((a, e) => a + e.ticketsSold, 0);
  const eventSet = new Set(events.map((e) => e.id));
  const relevantLogs = s.scanLogs.filter((l) => eventSet.has(l.eventId));
  const scansOk = relevantLogs.filter((l) => l.result === 'ok').length;
  const noShow = Math.max(0, sold - scansOk);
  return { sold, scansOk, noShow, recent: relevantLogs.slice(-30).reverse() };
}
