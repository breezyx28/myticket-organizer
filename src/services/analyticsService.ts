import { listEvents } from '@/services/eventsService';
import { listScanLogs } from '@/services/scannersService';
import type { AuctionListingMock, BookingActivity, ScanLog } from '@/types/domain';
import { organizerApi } from '@/store/api/organizerApi';
import { apiDispatch, apiUnwrap } from '@/services/apiDispatch';
import { mapOrderRowToBookingActivity, mapTicketsPaginatorToDistribution } from '@/lib/api/mapBooking';
import { tNs } from '@/lib/i18n/translateNs';
import type { LaravelPaginatorUnknown } from '@/schemas/organizer/responses/shared';

const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

export type SalesAnalyticsPayload = {
  summary: {
    total_tickets_sold: number;
    total_revenue_gross: number;
    live_or_upcoming_events: number;
    event_count: number;
    avg_order_value: number;
  };
  revenue_trend: Array<{ bucket_start: string; label: string; revenue: number }>;
  ticket_type_mix: Array<{ label: string; qty: number }>;
  event_inventory: Array<{
    event_id: string;
    event_title: string;
    sold: number;
    remaining: number;
    gross: number;
    by_type: Record<string, number>;
  }>;
  recent_bookings: Array<{
    id: string;
    event_id: string;
    event_title: string;
    buyer_email: string;
    qty: number;
    amount: number;
    ticket_type?: string | null;
    seat_ref?: string | null;
    at: string;
  }>;
  auction_activity: {
    active: number;
    sold: number;
    expired: number;
    listings: Array<{
      id: string;
      code?: string | null;
      event_id: string;
      status: string;
      price?: number | null;
      ends_at?: string | null;
      event_title?: string | null;
      final_price?: number | null;
    }>;
  };
};

export type SalesAnalyticsResponse = {
  data: SalesAnalyticsPayload;
  meta?: {
    from?: string;
    to?: string;
    timezone?: string;
    currency?: string;
    generated_at?: string;
  };
};

export type AttendanceAnalyticsPayload = {
  summary: {
    sold: number;
    scans_ok: number;
    scans_duplicate: number;
    scans_invalid: number;
    attendance_rate: number;
    no_show_estimate: number;
  };
  recent_logs: Array<{
    id: string;
    event_id: string;
    event_title: string;
    scanner_id?: string | null;
    scanner_name?: string | null;
    ticket_ref: string;
    result: string;
    at: string;
  }>;
  filters: {
    events: Array<{ id: string; title: string }>;
  };
};

export type AttendanceAnalyticsResponse = {
  data: AttendanceAnalyticsPayload;
  meta?: {
    event_id?: string;
    from?: string;
    to?: string;
    timezone?: string;
    generated_at?: string;
  };
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function asNum(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

export async function getSalesAnalytics(params?: {
  from?: string;
  to?: string;
  timezone?: string;
  eventIds?: string[];
  limitRecentBookings?: number;
  bucket?: 'hour' | 'day';
}): Promise<SalesAnalyticsResponse> {
  const raw = await apiUnwrap<unknown>(apiDispatch(organizerApi.endpoints.getSalesAnalytics.initiate(params)));
  const root = asRecord(raw) ?? {};
  const data = asRecord(root.data) ?? {};
  const summaryRaw = asRecord(data.summary) ?? {};
  const trendRaw = Array.isArray(data.revenue_trend) ? data.revenue_trend : [];
  const mixRaw = Array.isArray(data.ticket_type_mix) ? data.ticket_type_mix : [];
  const inventoryRaw = Array.isArray(data.event_inventory) ? data.event_inventory : [];
  const bookingsRaw = Array.isArray(data.recent_bookings) ? data.recent_bookings : [];
  const auctionRaw = asRecord(data.auction_activity) ?? {};
  const listingsRaw = Array.isArray(auctionRaw.listings) ? auctionRaw.listings : [];
  const metaRaw = asRecord(root.meta) ?? undefined;

  return {
    data: {
      summary: {
        total_tickets_sold: asNum(summaryRaw.total_tickets_sold),
        total_revenue_gross: asNum(summaryRaw.total_revenue_gross),
        live_or_upcoming_events: asNum(summaryRaw.live_or_upcoming_events),
        event_count: asNum(summaryRaw.event_count),
        avg_order_value: asNum(summaryRaw.avg_order_value),
      },
      revenue_trend: trendRaw.map((x) => {
        const o = asRecord(x) ?? {};
        return {
          bucket_start: asStr(o.bucket_start),
          label: asStr(o.label),
          revenue: asNum(o.revenue),
        };
      }),
      ticket_type_mix: mixRaw.map((x) => {
        const o = asRecord(x) ?? {};
        return { label: asStr(o.label, tNs('analytics', 'defaults.unspecified')), qty: asNum(o.qty) };
      }),
      event_inventory: inventoryRaw.map((x) => {
        const o = asRecord(x) ?? {};
        return {
          event_id: asStr(o.event_id),
          event_title: asStr(o.event_title, tNs('events', 'defaults.untitled')),
          sold: asNum(o.sold),
          remaining: asNum(o.remaining),
          gross: asNum(o.gross),
          by_type: (asRecord(o.by_type) as Record<string, number>) ?? {},
        };
      }),
      recent_bookings: bookingsRaw.map((x) => {
        const o = asRecord(x) ?? {};
        return {
          id: asStr(o.id),
          event_id: asStr(o.event_id),
          event_title: asStr(o.event_title, tNs('events', 'defaults.untitled')),
          buyer_email: asStr(o.buyer_email),
          qty: asNum(o.qty),
          amount: asNum(o.amount),
          ticket_type: asStr(o.ticket_type, '') || null,
          seat_ref: asStr(o.seat_ref, '') || null,
          at: asStr(o.at),
        };
      }),
      auction_activity: {
        active: asNum(auctionRaw.active),
        sold: asNum(auctionRaw.sold),
        expired: asNum(auctionRaw.expired),
        listings: listingsRaw.map((x) => {
          const o = asRecord(x) ?? {};
          return {
            id: asStr(o.id),
            code: asStr(o.code, '') || null,
            event_id: asStr(o.event_id),
            status: asStr(o.status),
            price: o.price == null ? null : asNum(o.price),
            ends_at: asStr(o.ends_at, '') || null,
            event_title: asStr(o.event_title, '') || null,
            final_price: o.final_price == null ? null : asNum(o.final_price),
          };
        }),
      },
    },
    meta: metaRaw
      ? {
          from: asStr(metaRaw.from, ''),
          to: asStr(metaRaw.to, ''),
          timezone: asStr(metaRaw.timezone, ''),
          currency: asStr(metaRaw.currency, ''),
          generated_at: asStr(metaRaw.generated_at, ''),
        }
      : undefined,
  };
}

export async function getAttendanceAnalytics(params?: {
  eventId?: string;
  from?: string;
  to?: string;
  timezone?: string;
  limitRecent?: number;
}): Promise<AttendanceAnalyticsResponse> {
  const raw = await apiUnwrap<unknown>(apiDispatch(organizerApi.endpoints.getAttendanceAnalytics.initiate(params)));
  const root = asRecord(raw) ?? {};
  const data = asRecord(root.data) ?? {};
  const summaryRaw = asRecord(data.summary) ?? {};
  const logsRaw = Array.isArray(data.recent_logs) ? data.recent_logs : [];
  const filtersRaw = asRecord(data.filters) ?? {};
  const eventsRaw = Array.isArray(filtersRaw.events) ? filtersRaw.events : [];
  const metaRaw = asRecord(root.meta) ?? undefined;

  return {
    data: {
      summary: {
        sold: asNum(summaryRaw.sold),
        scans_ok: asNum(summaryRaw.scans_ok),
        scans_duplicate: asNum(summaryRaw.scans_duplicate),
        scans_invalid: asNum(summaryRaw.scans_invalid),
        attendance_rate: asNum(summaryRaw.attendance_rate),
        no_show_estimate: asNum(summaryRaw.no_show_estimate),
      },
      recent_logs: logsRaw.map((x) => {
        const o = asRecord(x) ?? {};
        return {
          id: asStr(o.id),
          event_id: asStr(o.event_id),
          event_title: asStr(o.event_title, tNs('events', 'defaults.untitled')),
          scanner_id: asStr(o.scanner_id, '') || null,
          scanner_name: asStr(o.scanner_name, '') || null,
          ticket_ref: asStr(o.ticket_ref),
          result: asStr(o.result),
          at: asStr(o.at),
        };
      }),
      filters: {
        events: eventsRaw.map((x) => {
          const o = asRecord(x) ?? {};
          return { id: asStr(o.id), title: asStr(o.title, tNs('events', 'defaults.untitled')) };
        }),
      },
    },
    meta: metaRaw
      ? {
          event_id: asStr(metaRaw.event_id, ''),
          from: asStr(metaRaw.from, ''),
          to: asStr(metaRaw.to, ''),
          timezone: asStr(metaRaw.timezone, ''),
          generated_at: asStr(metaRaw.generated_at, ''),
        }
      : undefined,
  };
}

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
