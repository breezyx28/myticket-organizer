import { listEvents } from '@/services/eventsService';
import { listScanLogs } from '@/services/scannersService';
import type { AuctionListingMock, BookingActivity, ScanLog } from '@/types/domain';
import { organizerApi } from '@/store/api/organizerApi';
import { apiDispatch, apiUnwrap } from '@/services/apiDispatch';
import { mapOrderRowToBookingActivity, mapTicketsPaginatorToDistribution } from '@/lib/api/mapBooking';
import type { LaravelPaginatorUnknown } from '@/schemas/organizer/responses/shared';

const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

async function ordersFromEventsFirstPage(): Promise<BookingActivity[]> {
  const events = await listEvents();
  const out: BookingActivity[] = [];
  for (const ev of events) {
    try {
      const page = await apiUnwrap<LaravelPaginatorUnknown>(
        apiDispatch(organizerApi.endpoints.listEventOrders.initiate({ eventId: ev.id }))
      );
      for (const row of page.data) {
        const b = mapOrderRowToBookingActivity(row, ev.id, ev.title);
        if (b) out.push(b);
      }
    } catch {
      /* event may have no orders endpoint access */
    }
  }
  return out;
}

export async function getSalesSummary() {
  await delay();
  const events = await listEvents();
  const totalTickets = events.reduce((a, e) => a + e.ticketsSold, 0);
  const totalRevenue = events.reduce((a, e) => a + e.revenueGross, 0);
  const upcoming = events.filter(
    (e) => e.status === 'published' || e.status === 'pending_approval' || e.status === 'sold_out'
  ).length;
  return { totalTickets, totalRevenue, upcoming, eventCount: events.length };
}

export async function getBookingVelocity(): Promise<BookingActivity[]> {
  await delay();
  const bookings = await ordersFromEventsFirstPage();
  return [...bookings].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 12);
}

export async function getSalesByEvent() {
  await delay();
  const events = await listEvents();
  const bookings = await ordersFromEventsFirstPage();
  return events.map((e) => {
    const evBookings = bookings.filter((b) => b.eventId === e.id);
    const typeRevenue: Record<string, number> = {};
    evBookings.forEach((b) => {
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
  const events = await listEvents();
  const merged = new Map<string, number>();
  for (const ev of events) {
    try {
      const page = await apiUnwrap<LaravelPaginatorUnknown>(
        apiDispatch(organizerApi.endpoints.listEventTickets.initiate({ eventId: ev.id }))
      );
      for (const row of mapTicketsPaginatorToDistribution(page)) {
        merged.set(row.label, (merged.get(row.label) ?? 0) + row.qty);
      }
    } catch {
      /* skip */
    }
  }
  return Array.from(merged.entries()).map(([label, qty]) => ({ label, qty }));
}

export async function getAuctionActivity() {
  await delay();
  return {
    active: 0,
    sold: 0,
    expired: 0,
    listings: [] as AuctionListingMock[],
  };
}

export async function getAttendanceSummary() {
  await delay();
  const events = await listEvents();
  const sold = events.reduce((a, e) => a + e.ticketsSold, 0);
  let scansOk = 0;
  let recent: ScanLog[] = [];
  try {
    const logs = await listScanLogs();
    scansOk = logs.filter((l) => l.result === 'ok').length;
    recent = logs.slice(-20).reverse();
  } catch {
    recent = [];
  }
  const noShow = Math.max(0, sold - scansOk);
  return { sold, scansOk, noShow, recent };
}

export async function getAttendanceByEvent(eventId?: string) {
  await delay();
  const events = await listEvents();
  const filtered = eventId ? events.filter((e) => e.id === eventId) : events;
  const sold = filtered.reduce((a, e) => a + e.ticketsSold, 0);
  const eventSet = new Set(filtered.map((e) => e.id));
  let relevantLogs: ScanLog[] = [];
  try {
    const all = await listScanLogs();
    relevantLogs = all.filter((l) => eventSet.has(l.eventId));
  } catch {
    relevantLogs = [];
  }
  const scansOk = relevantLogs.filter((l) => l.result === 'ok').length;
  const noShow = Math.max(0, sold - scansOk);
  return { sold, scansOk, noShow, recent: relevantLogs.slice(-30).reverse() };
}
