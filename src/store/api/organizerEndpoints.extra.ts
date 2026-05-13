import type { BaseQueryFn, EndpointBuilder, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { z } from 'zod';
import { ORGANIZER_API_PREFIX } from '@/config/api';
import { unwrapEnvelope } from '@/lib/api/json';
import { parseLoginMutationResult, type LoginMutationResult } from '@/lib/api/parseLoginMutation';
import { safeParseResponse } from '@/lib/api/parseResponse';
import {
  laravelPaginatorShellSchema,
  messageResponseSchema,
  dataArrayEnvelopeSchema,
} from '@/schemas/organizer/responses/shared';
import { healthResponseSchema, versionResponseSchema } from '@/schemas/organizer/responses/auth';
import { financeExportsResponseSchema } from '@/schemas/organizer/responses/finance';

type OrganBuilder = EndpointBuilder<
  BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>,
  | 'Profile'
  | 'Event'
  | 'EventList'
  | 'Scanner'
  | 'ScanLog'
  | 'Venue'
  | 'SocialLink'
  | 'PreviousEvent'
  | 'BankAccount'
  | 'Kyc'
  | 'Payout'
  | 'TicketType'
  | 'Seat'
  | 'Order'
  | 'Ticket'
  | 'Refund'
  | 'Waitlist'
  | 'Engagement'
  | 'EngagementMessage',
  'organizerApi'
>;

const waitlistResponseSchema = z.object({
  count: z.coerce.number(),
  data: z.array(z.unknown()),
});

const notifyResponseSchema = z.object({
  dispatched: z.coerce.number(),
});

const seatsBulkResponseSchema = z.object({
  created: z.coerce.number(),
});

function orgPath(path: string) {
  return `${ORGANIZER_API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildExtraOrganizerEndpoints(builder: OrganBuilder) {
  return {
    health: builder.query<z.infer<typeof healthResponseSchema>, void>({
      query: () => orgPath('/health'),
      transformResponse: (raw: unknown) => safeParseResponse(healthResponseSchema, raw, 'GET /health'),
    }),

    version: builder.query<z.infer<typeof versionResponseSchema>, void>({
      query: () => orgPath('/version'),
      transformResponse: (raw: unknown) => safeParseResponse(versionResponseSchema, raw, 'GET /version'),
    }),

    oauthCallback: builder.mutation<LoginMutationResult, { provider: string; body: Record<string, unknown> }>({
      query: ({ provider, body }) => ({
        url: orgPath(`/auth/oauth/${encodeURIComponent(provider)}/callback`),
        method: 'POST',
        body,
      }),
      transformResponse: (raw: unknown) => parseLoginMutationResult(raw),
    }),

    listVenues: builder.query<unknown[], void>({
      query: () => orgPath('/me/venues'),
      transformResponse: (raw: unknown) => {
        const d = safeParseResponse(dataArrayEnvelopeSchema, raw, 'GET /me/venues');
        return d.data;
      },
      providesTags: ['Profile'],
    }),

    createVenue: builder.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: orgPath('/me/venues'), method: 'POST', body }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: ['Profile'],
    }),

    patchVenue: builder.mutation<unknown, { id: string | number; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: orgPath(`/me/venues/${encodeURIComponent(String(id))}`),
        method: 'PATCH',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: ['Profile'],
    }),

    deleteVenue: builder.mutation<{ message: string }, string | number>({
      query: (id) => ({ url: orgPath(`/me/venues/${encodeURIComponent(String(id))}`), method: 'DELETE' }),
      transformResponse: (raw: unknown) => safeParseResponse(messageResponseSchema, raw, 'DELETE venue'),
      invalidatesTags: ['Profile'],
    }),

    createSocialLink: builder.mutation<unknown, { platform: string; url: string }>({
      query: (body) => ({ url: orgPath('/me/social-links'), method: 'POST', body }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: ['Profile'],
    }),

    deleteSocialLink: builder.mutation<{ message: string }, string | number>({
      query: (id) => ({ url: orgPath(`/me/social-links/${encodeURIComponent(String(id))}`), method: 'DELETE' }),
      transformResponse: (raw: unknown) => safeParseResponse(messageResponseSchema, raw, 'DELETE social'),
      invalidatesTags: ['Profile'],
    }),

    createPreviousEvent: builder.mutation<unknown, { title: string }>({
      query: (body) => ({ url: orgPath('/me/previous-events'), method: 'POST', body }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: ['Profile'],
    }),

    deletePreviousEvent: builder.mutation<{ message: string }, string | number>({
      query: (id) => ({ url: orgPath(`/me/previous-events/${encodeURIComponent(String(id))}`), method: 'DELETE' }),
      transformResponse: (raw: unknown) => safeParseResponse(messageResponseSchema, raw, 'DELETE previous-event'),
      invalidatesTags: ['Profile'],
    }),

    listBankAccounts: builder.query<unknown[], void>({
      query: () => orgPath('/me/bank-accounts'),
      transformResponse: (raw: unknown) => (Array.isArray(raw) ? raw : []),
      providesTags: ['BankAccount'],
    }),

    createBankAccount: builder.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: orgPath('/me/bank-accounts'), method: 'POST', body }),
      invalidatesTags: ['BankAccount'],
    }),

    patchBankAccount: builder.mutation<unknown, { id: string | number; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: orgPath(`/me/bank-accounts/${encodeURIComponent(String(id))}`),
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['BankAccount'],
    }),

    deleteBankAccount: builder.mutation<{ message: string }, string | number>({
      query: (id) => ({ url: orgPath(`/me/bank-accounts/${encodeURIComponent(String(id))}`), method: 'DELETE' }),
      transformResponse: (raw: unknown) => safeParseResponse(messageResponseSchema, raw, 'DELETE bank'),
      invalidatesTags: ['BankAccount'],
    }),

    setDefaultBankAccount: builder.mutation<unknown, string | number>({
      query: (id) => ({
        url: orgPath(`/me/bank-accounts/${encodeURIComponent(String(id))}/set-default`),
        method: 'POST',
      }),
      invalidatesTags: ['BankAccount'],
    }),

    listKycDocuments: builder.query<unknown[], void>({
      query: () => orgPath('/me/kyc-documents'),
      transformResponse: (raw: unknown) => (Array.isArray(raw) ? raw : []),
      providesTags: ['Kyc'],
    }),

    createKycDocument: builder.mutation<unknown, FormData | Record<string, unknown>>({
      query: (body) => ({ url: orgPath('/me/kyc-documents'), method: 'POST', body }),
      invalidatesTags: ['Kyc'],
    }),

    deleteKycDocument: builder.mutation<{ message: string }, string | number>({
      query: (id) => ({ url: orgPath(`/me/kyc-documents/${encodeURIComponent(String(id))}`), method: 'DELETE' }),
      transformResponse: (raw: unknown) => safeParseResponse(messageResponseSchema, raw, 'DELETE kyc'),
      invalidatesTags: ['Kyc'],
    }),

    listPayouts: builder.query<z.infer<typeof laravelPaginatorShellSchema>, { page?: number } | void>({
      query: (arg) => {
        const page = typeof arg === 'object' && arg?.page != null ? arg.page : 1;
        return orgPath(`/me/payouts?page=${page}`);
      },
      transformResponse: (raw: unknown) => safeParseResponse(laravelPaginatorShellSchema, raw, 'GET payouts'),
      providesTags: ['Payout'],
    }),

    getPayout: builder.query<unknown, string | number>({
      query: (id) => orgPath(`/me/payouts/${encodeURIComponent(String(id))}`),
      providesTags: (_r, _e, id) => [{ type: 'Payout', id: String(id) }],
    }),

    getPayoutLineItems: builder.query<unknown[], string | number>({
      query: (id) => orgPath(`/me/payouts/${encodeURIComponent(String(id))}/line-items`),
      transformResponse: (raw: unknown) => (Array.isArray(raw) ? raw : []),
      providesTags: (_r, _e, id) => [{ type: 'Payout', id: String(id) }],
    }),

    getFinanceExports: builder.query<z.infer<typeof financeExportsResponseSchema>, void>({
      query: () => orgPath('/me/finance/exports'),
      transformResponse: (raw: unknown) => safeParseResponse(financeExportsResponseSchema, raw, 'GET finance exports'),
    }),

    getSalesAnalytics: builder.query<
      unknown,
      {
        from?: string;
        to?: string;
        timezone?: string;
        eventIds?: string[];
        limitRecentBookings?: number;
        bucket?: 'hour' | 'day';
      } | void
    >({
      query: (arg) => {
        const q = new URLSearchParams();
        if (arg?.from) q.set('from', arg.from);
        if (arg?.to) q.set('to', arg.to);
        if (arg?.timezone) q.set('timezone', arg.timezone);
        if (arg?.bucket) q.set('bucket', arg.bucket);
        if (arg?.limitRecentBookings != null) q.set('limit_recent_bookings', String(arg.limitRecentBookings));
        for (const id of arg?.eventIds ?? []) q.append('event_ids[]', id);
        const qs = q.toString();
        return orgPath(`/analytics/sales${qs ? `?${qs}` : ''}`);
      },
      transformResponse: (raw: unknown) => raw,
    }),

    getAttendanceAnalytics: builder.query<
      unknown,
      {
        eventId?: string;
        from?: string;
        to?: string;
        timezone?: string;
        limitRecent?: number;
      } | void
    >({
      query: (arg) => {
        const q = new URLSearchParams();
        if (arg?.eventId) q.set('event_id', arg.eventId);
        if (arg?.from) q.set('from', arg.from);
        if (arg?.to) q.set('to', arg.to);
        if (arg?.timezone) q.set('timezone', arg.timezone);
        if (arg?.limitRecent != null) q.set('limit_recent', String(arg.limitRecent));
        const qs = q.toString();
        return orgPath(`/analytics/attendance${qs ? `?${qs}` : ''}`);
      },
      transformResponse: (raw: unknown) => raw,
    }),

    postEventGallery: builder.mutation<unknown, { eventId: string; body: Record<string, unknown> | FormData }>({
      query: ({ eventId, body }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/gallery`),
        method: 'POST',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    postEventCover: builder.mutation<unknown, { eventId: string; body: Record<string, unknown> | FormData }>({
      query: ({ eventId, body }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/cover`),
        method: 'POST',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    deleteEventGalleryItem: builder.mutation<{ message: string }, { eventId: string; itemId: string | number }>({
      query: ({ eventId, itemId }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/gallery/${encodeURIComponent(String(itemId))}`),
        method: 'DELETE',
      }),
      transformResponse: (raw: unknown) => safeParseResponse(messageResponseSchema, raw, 'DELETE gallery'),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    postEventRecurrence: builder.mutation<unknown, { eventId: string; body: Record<string, unknown> }>({
      query: ({ eventId, body }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/recurrence`),
        method: 'POST',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    postEventOccurrencesRegenerate: builder.mutation<unknown[], { eventId: string }>({
      query: ({ eventId }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/occurrences/regenerate`),
        method: 'POST',
      }),
      transformResponse: (raw: unknown) => {
        const d = unwrapEnvelope(raw);
        return Array.isArray(d) ? d : [];
      },
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    postEventTalent: builder.mutation<unknown, { eventId: string; body: Record<string, unknown> }>({
      query: ({ eventId, body }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/talents`),
        method: 'POST',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    deleteEventTalent: builder.mutation<{ message: string }, { eventId: string; linkId: string | number }>({
      query: ({ eventId, linkId }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/talents/${encodeURIComponent(String(linkId))}`),
        method: 'DELETE',
      }),
      transformResponse: (raw: unknown) => safeParseResponse(messageResponseSchema, raw, 'DELETE talent'),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    postEventVendor: builder.mutation<unknown, { eventId: string; body: Record<string, unknown> }>({
      query: ({ eventId, body }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/vendors`),
        method: 'POST',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    deleteEventVendor: builder.mutation<{ message: string }, { eventId: string; linkId: string | number }>({
      query: ({ eventId, linkId }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/vendors/${encodeURIComponent(String(linkId))}`),
        method: 'DELETE',
      }),
      transformResponse: (raw: unknown) => safeParseResponse(messageResponseSchema, raw, 'DELETE vendor'),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    postEventPostMedia: builder.mutation<unknown, { eventId: string; body: Record<string, unknown> | FormData }>({
      query: ({ eventId, body }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/post-media`),
        method: 'POST',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Event', id: eventId }],
    }),

    listTicketTypes: builder.query<unknown[], string>({
      query: (eventId) => orgPath(`/events/${encodeURIComponent(eventId)}/ticket-types`),
      transformResponse: (raw: unknown) => {
        const d = safeParseResponse(dataArrayEnvelopeSchema, raw, 'ticket-types');
        return d.data;
      },
      providesTags: (_r, _e, eventId) => [{ type: 'TicketType', id: eventId }],
    }),

    createTicketType: builder.mutation<unknown, { eventId: string; body: Record<string, unknown> }>({
      query: ({ eventId, body }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/ticket-types`),
        method: 'POST',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { eventId }) => [
        { type: 'TicketType', id: eventId },
        { type: 'Event', id: eventId },
      ],
    }),

    patchTicketType: builder.mutation<unknown, { eventId: string; ticketTypeId: string | number; body: Record<string, unknown> }>({
      query: ({ eventId, ticketTypeId, body }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/ticket-types/${encodeURIComponent(String(ticketTypeId))}`),
        method: 'PATCH',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { eventId }) => [
        { type: 'TicketType', id: eventId },
        { type: 'Event', id: eventId },
      ],
    }),

    deleteTicketType: builder.mutation<{ message: string }, { eventId: string; ticketTypeId: string | number }>({
      query: ({ eventId, ticketTypeId }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/ticket-types/${encodeURIComponent(String(ticketTypeId))}`),
        method: 'DELETE',
      }),
      transformResponse: (raw: unknown) => safeParseResponse(messageResponseSchema, raw, 'DELETE ticket type'),
      invalidatesTags: (_r, _e, { eventId }) => [
        { type: 'TicketType', id: eventId },
        { type: 'Event', id: eventId },
      ],
    }),

    listSeats: builder.query<unknown[], string>({
      query: (eventId) => orgPath(`/events/${encodeURIComponent(eventId)}/seats`),
      transformResponse: (raw: unknown) => {
        const d = safeParseResponse(dataArrayEnvelopeSchema, raw, 'seats');
        return d.data;
      },
      providesTags: (_r, _e, eventId) => [{ type: 'Seat', id: eventId }],
    }),

    bulkSeats: builder.mutation<z.infer<typeof seatsBulkResponseSchema>, { eventId: string; body: Record<string, unknown> }>({
      query: ({ eventId, body }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/seats/bulk`),
        method: 'POST',
        body,
      }),
      transformResponse: (raw: unknown) => safeParseResponse(seatsBulkResponseSchema, raw, 'bulk seats'),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Seat', id: eventId }, { type: 'Event', id: eventId }],
    }),

    patchSeat: builder.mutation<unknown, { eventId: string; seatId: string | number; body: Record<string, unknown> }>({
      query: ({ eventId, seatId, body }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/seats/${encodeURIComponent(String(seatId))}`),
        method: 'PATCH',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Seat', id: eventId }, { type: 'Event', id: eventId }],
    }),

    deleteSeat: builder.mutation<{ message: string }, { eventId: string; seatId: string | number }>({
      query: ({ eventId, seatId }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/seats/${encodeURIComponent(String(seatId))}`),
        method: 'DELETE',
      }),
      transformResponse: (raw: unknown) => safeParseResponse(messageResponseSchema, raw, 'DELETE seat'),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Seat', id: eventId }, { type: 'Event', id: eventId }],
    }),

    listEventOrders: builder.query<z.infer<typeof laravelPaginatorShellSchema>, { eventId: string; page?: number }>({
      query: ({ eventId, page }) =>
        orgPath(`/events/${encodeURIComponent(eventId)}/orders${page != null && page > 1 ? `?page=${page}` : ''}`),
      transformResponse: (raw: unknown) => safeParseResponse(laravelPaginatorShellSchema, raw, 'orders'),
      providesTags: (_r, _e, { eventId }) => [{ type: 'Order', id: eventId }],
    }),

    listEventTickets: builder.query<z.infer<typeof laravelPaginatorShellSchema>, { eventId: string; page?: number }>({
      query: ({ eventId, page }) =>
        orgPath(`/events/${encodeURIComponent(eventId)}/tickets${page != null && page > 1 ? `?page=${page}` : ''}`),
      transformResponse: (raw: unknown) => safeParseResponse(laravelPaginatorShellSchema, raw, 'tickets'),
      providesTags: (_r, _e, { eventId }) => [{ type: 'Ticket', id: eventId }],
    }),

    compTicket: builder.mutation<unknown, { eventId: string; ticketId: string | number }>({
      query: ({ eventId, ticketId }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(String(ticketId))}/comp`),
        method: 'POST',
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Ticket', id: eventId }, { type: 'Order', id: eventId }],
    }),

    approveRefund: builder.mutation<unknown, { eventId: string; refundId: string | number }>({
      query: ({ eventId, refundId }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/refunds/${encodeURIComponent(String(refundId))}/approve`),
        method: 'POST',
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Refund', id: eventId }, { type: 'Order', id: eventId }],
    }),

    rejectRefund: builder.mutation<unknown, { eventId: string; refundId: string | number }>({
      query: ({ eventId, refundId }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/refunds/${encodeURIComponent(String(refundId))}/reject`),
        method: 'POST',
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Refund', id: eventId }, { type: 'Order', id: eventId }],
    }),

    getEventWaitlist: builder.query<z.infer<typeof waitlistResponseSchema>, string>({
      query: (eventId) => orgPath(`/events/${encodeURIComponent(eventId)}/waitlist`),
      transformResponse: (raw: unknown) => safeParseResponse(waitlistResponseSchema, raw, 'waitlist'),
      providesTags: (_r, _e, eventId) => [{ type: 'Waitlist', id: eventId }],
    }),

    postEventNotify: builder.mutation<z.infer<typeof notifyResponseSchema>, { eventId: string; kind?: 'edited' | 'cancelled' }>({
      query: ({ eventId, kind }) => ({
        url: orgPath(`/events/${encodeURIComponent(eventId)}/notify`),
        method: 'POST',
        body: kind != null ? { kind } : {},
      }),
      transformResponse: (raw: unknown) => safeParseResponse(notifyResponseSchema, raw, 'notify'),
      invalidatesTags: (_r, _e, { eventId }) => [{ type: 'Waitlist', id: eventId }],
    }),

    listEngagements: builder.query<z.infer<typeof laravelPaginatorShellSchema>, { page?: number } | void>({
      query: (arg) => {
        const page = typeof arg === 'object' && arg?.page != null ? arg.page : 1;
        return orgPath(`/engagements?page=${page}`);
      },
      transformResponse: (raw: unknown) => safeParseResponse(laravelPaginatorShellSchema, raw, 'engagements'),
      providesTags: ['Engagement'],
    }),

    createEngagement: builder.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: orgPath('/engagements'), method: 'POST', body }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: ['Engagement'],
    }),

    patchEngagement: builder.mutation<unknown, { id: string | number; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: orgPath(`/engagements/${encodeURIComponent(String(id))}`),
        method: 'PATCH',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { id }) => [
        'Engagement',
        { type: 'Engagement', id: String(id) },
        { type: 'EngagementMessage', id: String(id) },
      ],
    }),

    cancelEngagement: builder.mutation<unknown, string | number>({
      query: (id) => ({
        url: orgPath(`/engagements/${encodeURIComponent(String(id))}/cancel`),
        method: 'POST',
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, id) => ['Engagement', { type: 'Engagement', id: String(id) }],
    }),

    postEngagementMessage: builder.mutation<unknown, { engagementId: string | number; body: Record<string, unknown> }>({
      query: ({ engagementId, body }) => ({
        url: orgPath(`/engagements/${encodeURIComponent(String(engagementId))}/messages`),
        method: 'POST',
        body,
      }),
      transformResponse: (raw: unknown) => unwrapEnvelope(raw),
      invalidatesTags: (_r, _e, { engagementId }) => [{ type: 'EngagementMessage', id: String(engagementId) }],
    }),

    listEngagementMessages: builder.query<unknown[], string | number>({
      query: (engagementId) => orgPath(`/engagements/${encodeURIComponent(String(engagementId))}/messages`),
      transformResponse: (raw: unknown) => {
        const d = safeParseResponse(dataArrayEnvelopeSchema, raw, 'engagement messages');
        return d.data;
      },
      providesTags: (_r, _e, engagementId) => [{ type: 'EngagementMessage', id: String(engagementId) }],
    }),
  };
}
