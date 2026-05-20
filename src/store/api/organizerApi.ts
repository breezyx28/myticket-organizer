import { createApi } from '@reduxjs/toolkit/query/react';
import { ORGANIZER_API_PREFIX } from '@/config/api';
import { organizerBaseQuery } from '@/store/api/organizerBaseQuery';
import {
  organizerLoginRequestSchema,
  organizerProfilePatchSchema,
  organizerScannerAssignmentSchema,
  organizerScannerCreateSchema,
} from '@/schemas/organizer/requests';
import { extractAccessTokenFromLoginResponse } from '@/lib/api/extractAuth';
import { mapApiEventToOrganizerEvent, mapApiPatchEventResponse } from '@/lib/api/mapEvent';
import { mapApiProfileToOrganizerUser, organizerUserToProfilePatch } from '@/lib/api/mapProfile';
import { parseProfileDocumentUrl, parseProfileGalleryImageUrl } from '@/lib/api/parseProfileUpload';
import { mapApiScannersList, mapApiScannerToScannerAccount } from '@/lib/api/mapScanner';
import { mapApiScanLogsList } from '@/lib/api/mapScanLog';
import { mapApiFinanceSummary } from '@/lib/api/mapFinance';
import { laravelPaginatorShellSchema } from '@/schemas/organizer/responses/shared';
import { refreshTokenResponseSchema } from '@/schemas/organizer/responses/auth';
import { safeParseResponse } from '@/lib/api/parseResponse';
import type { FinanceSnapshot, OrganizerEvent, OrganizerUser, ScanLog, ScannerAccount } from '@/types/domain';
import { buildExtraOrganizerEndpoints } from '@/store/api/organizerEndpoints.extra';
import { parseLoginMutationResult, type LoginMutationResult } from '@/lib/api/parseLoginMutation';

export type { LoginMutationResult } from '@/lib/api/parseLoginMutation';

export type ListEventsPage = {
  data: OrganizerEvent[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type OrganizerScannerCreateInput = {
  name: string;
  email: string;
  password?: string | null;
  user_id?: number | null;
};

export const organizerApi = createApi({
  reducerPath: 'organizerApi',
  baseQuery: organizerBaseQuery,
  tagTypes: [
    'Profile',
    'Event',
    'EventList',
    'Scanner',
    'ScanLog',
    'Venue',
    'SocialLink',
    'PreviousEvent',
    'BankAccount',
    'Kyc',
    'Payout',
    'TicketType',
    'Seat',
    'Order',
    'Ticket',
    'Refund',
    'Waitlist',
    'Engagement',
    'EngagementMessage',
    'Notification',
  ],
  endpoints: (builder) => ({
    ...buildExtraOrganizerEndpoints(builder),
    login: builder.mutation<LoginMutationResult, unknown>({
      query: (body) => ({
        url: `${ORGANIZER_API_PREFIX}/auth/login`,
        method: 'POST',
        body: organizerLoginRequestSchema.parse(body),
      }),
      transformResponse: (raw: unknown): LoginMutationResult => parseLoginMutationResult(raw),
    }),

    logout: builder.mutation<{ message?: string }, void>({
      query: () => ({
        url: `${ORGANIZER_API_PREFIX}/auth/logout`,
        method: 'POST',
      }),
    }),

    refresh: builder.mutation<{ accessToken: string | null }, void>({
      query: () => ({
        url: `${ORGANIZER_API_PREFIX}/auth/refresh`,
        method: 'POST',
      }),
      transformResponse: (raw: unknown) => {
        const parsed = refreshTokenResponseSchema.safeParse(raw);
        if (parsed.success) return { accessToken: parsed.data.token };
        return { accessToken: extractAccessTokenFromLoginResponse(raw) };
      },
    }),

    getProfile: builder.query<OrganizerUser, void>({
      query: () => `${ORGANIZER_API_PREFIX}/me/profile`,
      transformResponse: (raw: unknown) => mapApiProfileToOrganizerUser(raw),
      providesTags: ['Profile'],
    }),

    /** Raw JSON from GET /me/profile (ids on social_links / previous_events). Uses same base URL and 401 refresh as other organizer calls. */
    getProfileRaw: builder.query<unknown, void>({
      query: () => `${ORGANIZER_API_PREFIX}/me/profile`,
      providesTags: ['Profile'],
    }),

    patchProfile: builder.mutation<OrganizerUser, Partial<OrganizerUser>>({
      query: (patch) => {
        const body = organizerProfilePatchSchema.parse(organizerUserToProfilePatch(patch));
        return {
          url: `${ORGANIZER_API_PREFIX}/me/profile`,
          method: 'PATCH',
          body,
        };
      },
      transformResponse: (raw: unknown) => mapApiProfileToOrganizerUser(raw),
      invalidatesTags: ['Profile'],
    }),

    postProfileLogo: builder.mutation<OrganizerUser, FormData>({
      query: (formData) => ({
        url: `${ORGANIZER_API_PREFIX}/me/profile/logo`,
        method: 'POST',
        body: formData,
      }),
      transformResponse: (raw: unknown) => mapApiProfileToOrganizerUser(raw),
      invalidatesTags: ['Profile'],
    }),

    /** Multipart field `document` — returns public `document_url` when response includes it (or full profile). */
    postProfileDocument: builder.mutation<string, FormData>({
      query: (formData) => ({
        url: `${ORGANIZER_API_PREFIX}/me/profile/document`,
        method: 'POST',
        body: formData,
      }),
      transformResponse: (raw: unknown) => {
        const u = parseProfileDocumentUrl(raw);
        if (!u) throw new Error('Document upload succeeded but no public URL was returned.');
        return u;
      },
      invalidatesTags: ['Profile'],
    }),

    /** Multipart field `image` — returns new gallery image URL when response includes it (or full profile). */
    postProfileGallery: builder.mutation<string, FormData>({
      query: (formData) => ({
        url: `${ORGANIZER_API_PREFIX}/me/profile/gallery`,
        method: 'POST',
        body: formData,
      }),
      transformResponse: (raw: unknown) => {
        const u = parseProfileGalleryImageUrl(raw);
        if (!u) throw new Error('Gallery upload succeeded but no public URL was returned.');
        return u;
      },
      invalidatesTags: ['Profile'],
    }),

    listEvents: builder.query<ListEventsPage, { page?: number } | void>({
      query: (arg) => {
        const page = typeof arg === 'object' && arg?.page != null ? arg.page : 1;
        return `${ORGANIZER_API_PREFIX}/events?page=${page}`;
      },
      transformResponse: (raw: unknown): ListEventsPage => {
        const shell = safeParseResponse(laravelPaginatorShellSchema, raw, 'GET /events');
        return {
          data: shell.data.map((row) => mapApiEventToOrganizerEvent(row)),
          current_page: shell.current_page,
          last_page: shell.last_page,
          per_page: shell.per_page,
          total: shell.total,
        };
      },
      providesTags: (res) =>
        res
          ? [...res.data.map((e) => ({ type: 'Event' as const, id: e.id })), { type: 'EventList' as const, id: 'LIST' }]
          : [{ type: 'EventList', id: 'LIST' }],
    }),

    getEvent: builder.query<OrganizerEvent, string>({
      query: (id) => `${ORGANIZER_API_PREFIX}/events/${encodeURIComponent(id)}`,
      transformResponse: (raw: unknown) => mapApiEventToOrganizerEvent(raw),
      providesTags: (_r, _e, id) => [{ type: 'Event', id }],
    }),

    createEvent: builder.mutation<OrganizerEvent, Record<string, unknown> | void>({
      query: (body) => ({
        url: `${ORGANIZER_API_PREFIX}/events`,
        method: 'POST',
        body: body && typeof body === 'object' ? body : {},
      }),
      transformResponse: (raw: unknown) => mapApiEventToOrganizerEvent(raw),
      invalidatesTags: [{ type: 'EventList', id: 'LIST' }, 'ScanLog'],
    }),

    patchEvent: builder.mutation<OrganizerEvent, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({
        url: `${ORGANIZER_API_PREFIX}/events/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (raw: unknown) => mapApiPatchEventResponse(raw),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Event', id }, { type: 'EventList', id: 'LIST' }, 'ScanLog'],
    }),

    deleteEvent: builder.mutation<void, string>({
      query: (id) => ({
        url: `${ORGANIZER_API_PREFIX}/events/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Event', id }, { type: 'EventList', id: 'LIST' }, 'ScanLog'],
    }),

    submitEvent: builder.mutation<OrganizerEvent, string>({
      query: (id) => ({
        url: `${ORGANIZER_API_PREFIX}/events/${encodeURIComponent(id)}/submit`,
        method: 'POST',
      }),
      transformResponse: (raw: unknown) => mapApiEventToOrganizerEvent(raw),
      invalidatesTags: (_r, _e, id) => [{ type: 'Event', id }, { type: 'EventList', id: 'LIST' }],
    }),

    cancelEvent: builder.mutation<OrganizerEvent, string>({
      query: (id) => ({
        url: `${ORGANIZER_API_PREFIX}/events/${encodeURIComponent(id)}/cancel`,
        method: 'POST',
      }),
      transformResponse: (raw: unknown) => mapApiEventToOrganizerEvent(raw),
      invalidatesTags: (_r, _e, id) => [{ type: 'Event', id }, { type: 'EventList', id: 'LIST' }],
    }),

    archiveEvent: builder.mutation<OrganizerEvent, string>({
      query: (id) => ({
        url: `${ORGANIZER_API_PREFIX}/events/${encodeURIComponent(id)}/archive`,
        method: 'POST',
      }),
      transformResponse: (raw: unknown) => mapApiEventToOrganizerEvent(raw),
      invalidatesTags: (_r, _e, id) => [{ type: 'Event', id }, { type: 'EventList', id: 'LIST' }],
    }),

    listScanners: builder.query<ScannerAccount[], void>({
      query: () => `${ORGANIZER_API_PREFIX}/scanners`,
      transformResponse: (raw: unknown) => mapApiScannersList(raw),
      providesTags: (res) =>
        res
          ? [...res.map((s) => ({ type: 'Scanner' as const, id: s.id })), { type: 'Scanner' as const, id: 'LIST' }]
          : [{ type: 'Scanner', id: 'LIST' }],
    }),

    createScanner: builder.mutation<ScannerAccount, OrganizerScannerCreateInput>({
      query: (body) => ({
        url: `${ORGANIZER_API_PREFIX}/scanners`,
        method: 'POST',
        body: organizerScannerCreateSchema.parse(body),
      }),
      transformResponse: (raw: unknown) => mapApiScannerToScannerAccount(raw),
      invalidatesTags: [{ type: 'Scanner', id: 'LIST' }],
    }),

    assignScanner: builder.mutation<unknown, { scannerId: string; eventId: string }>({
      query: ({ scannerId, eventId }) => {
        const event_id = Number(eventId);
        const body = organizerScannerAssignmentSchema.parse({
          event_id: Number.isNaN(event_id) ? 0 : event_id,
        });
        return {
          url: `${ORGANIZER_API_PREFIX}/scanners/${encodeURIComponent(scannerId)}/assignments`,
          method: 'POST',
          body,
        };
      },
      invalidatesTags: [{ type: 'Scanner', id: 'LIST' }, 'ScanLog'],
    }),

    unassignScanner: builder.mutation<void, { scannerId: string; assignmentId: string }>({
      query: ({ scannerId, assignmentId }) => ({
        url: `${ORGANIZER_API_PREFIX}/scanners/${encodeURIComponent(scannerId)}/assignments/${encodeURIComponent(assignmentId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Scanner', id: 'LIST' }, 'ScanLog'],
    }),

    revokeScannerDevice: builder.mutation<unknown, { scannerId: string; deviceId: string }>({
      query: ({ scannerId, deviceId }) => ({
        url: `${ORGANIZER_API_PREFIX}/scanners/${encodeURIComponent(scannerId)}/devices/${encodeURIComponent(deviceId)}/revoke`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Scanner', id: 'LIST' }],
    }),

    getEventScanLogs: builder.query<ScanLog[], { eventId: string; page?: number }>({
      query: ({ eventId, page }) =>
        `${ORGANIZER_API_PREFIX}/events/${encodeURIComponent(eventId)}/scan-logs${page != null && page > 1 ? `?page=${page}` : ''}`,
      transformResponse: (raw: unknown, _meta, arg) => mapApiScanLogsList(raw, arg.eventId),
      providesTags: (_r, _e, arg) => [{ type: 'ScanLog', id: arg.eventId }],
    }),

    getFinanceSummary: builder.query<FinanceSnapshot, void>({
      query: () => `${ORGANIZER_API_PREFIX}/me/finance/summary`,
      transformResponse: (raw: unknown) => mapApiFinanceSummary(raw),
    }),
  }),
});

export const { useLoginMutation, useLogoutMutation, useRefreshMutation } = organizerApi;
