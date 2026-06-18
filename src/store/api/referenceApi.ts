import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ApiBaseUrl, MAIN_API_PREFIX, REFERENCE_API_PREFIX } from '@/config/api';
import { eventCategoriesEnvelopeSchema, type EventCategoryRow } from '@/schemas/reference/eventCategories';
import { appendAcceptLanguage } from '@/lib/locale/apiHeaders';
import {
  saudiCitiesEnvelopeSchema,
  saudiRegionsEnvelopeSchema,
  type SaudiRefCityFlat,
  type SaudiRefRegionRow,
} from '@/schemas/reference/saudi';

export type SaudiRegionOption = { id: string; name: string; cities: { id: string; name: string }[] };
export type SaudiCityOption = { id: string; name: string; regionId: string };

export type EventCategoryOption = { id: string; name: string; slug?: string };

function toIdStr(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
  if (typeof v === 'string') return v.trim();
  return '';
}

function normalizeRegions(rows: SaudiRefRegionRow[]): SaudiRegionOption[] {
  return rows.map((r) => ({
    id: toIdStr(r.id),
    name: r.name.trim(),
    cities: (r.cities ?? []).map((c) => ({ id: toIdStr(c.id), name: c.name.trim() })).filter((c) => c.id),
  })).filter((r) => r.id);
}

function normalizeCitiesFlat(rows: SaudiRefCityFlat[]): SaudiCityOption[] {
  return rows
    .map((row) => ({
      id: toIdStr(row.id),
      name: row.name.trim(),
      regionId: toIdStr(row.region_id),
    }))
    .filter((c) => c.id && c.regionId);
}

function normalizeEventCategories(rows: EventCategoryRow[]): EventCategoryOption[] {
  return rows
    .map((r) => ({
      id: toIdStr(r.id),
      name: r.name.trim(),
      slug: r.slug?.trim() || undefined,
    }))
    .filter((r) => r.id && r.name);
}

/** Public reference data (no Bearer); same origin as organizer API. */
export const referenceApi = createApi({
  reducerPath: 'referenceApi',
  tagTypes: ['SaudiRegion', 'SaudiCity', 'EventCategory'],
  baseQuery: fetchBaseQuery({
    baseUrl: ApiBaseUrl,
    prepareHeaders: (headers, { getState }) => {
      headers.set('Accept', 'application/json');
      appendAcceptLanguage(headers, getState);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    listSaudiRegions: builder.query<SaudiRegionOption[], void>({
      query: () => `${REFERENCE_API_PREFIX}/saudi-regions`,
      providesTags: [{ type: 'SaudiRegion', id: 'LIST' }],
      transformResponse: (raw: unknown) => {
        const parsed = saudiRegionsEnvelopeSchema.safeParse(raw);
        if (!parsed.success) return [];
        return normalizeRegions(parsed.data.data);
      },
    }),
    /** When `regionId` is set, requests `?region_id=` for that region (API expects numeric id). */
    listSaudiCities: builder.query<SaudiCityOption[], string>({
      query: (regionId) => ({
        url: `${REFERENCE_API_PREFIX}/saudi-cities`,
        params: regionId.trim() ? { region_id: regionId.trim() } : {},
      }),
      providesTags: (_r, _e, regionId) => [{ type: 'SaudiCity', id: regionId.trim() || 'ALL' }],
      transformResponse: (raw: unknown) => {
        const parsed = saudiCitiesEnvelopeSchema.safeParse(raw);
        if (!parsed.success) return [];
        return normalizeCitiesFlat(parsed.data.data);
      },
    }),

    /** GET /api/v1/main/events/categories — discovery categories (public). */
    listEventCategories: builder.query<EventCategoryOption[], void>({
      query: () => `${MAIN_API_PREFIX}/events/categories`,
      providesTags: [{ type: 'EventCategory', id: 'LIST' }],
      transformResponse: (raw: unknown) => {
        const parsed = eventCategoriesEnvelopeSchema.safeParse(raw);
        if (!parsed.success) return [];
        return normalizeEventCategories(parsed.data.data);
      },
    }),
  }),
});

export const { useListSaudiRegionsQuery, useListSaudiCitiesQuery, useListEventCategoriesQuery } = referenceApi;
