import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ApiBaseUrl, MAIN_API_PREFIX, REFERENCE_API_PREFIX } from '@/config/api';
import { eventCategoriesEnvelopeSchema, type EventCategoryRow } from '@/schemas/reference/eventCategories';
import { appendAcceptLanguage } from '@/lib/locale/apiHeaders';
import {
  normalizeLocalizedRefName,
  type LocalizedRefName,
} from '@/lib/locale/localizedRefName';
import {
  saudiCitiesEnvelopeSchema,
  saudiRegionsEnvelopeSchema,
  type SaudiRefCityFlat,
  type SaudiRefRegionRow,
} from '@/schemas/reference/saudi';

export type SaudiCityNestedOption = LocalizedRefName & { id: string };

export type SaudiRegionOption = LocalizedRefName & {
  id: string;
  code?: string;
  cities: SaudiCityNestedOption[];
};

export type SaudiCityOption = LocalizedRefName & { id: string; regionId: string };

export type EventCategoryOption = LocalizedRefName & { id: string; slug?: string };

function toIdStr(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
  if (typeof v === 'string') return v.trim();
  return '';
}

function normalizeCityNested(c: { id: unknown; name: string; name_en?: string; name_ar?: string }): SaudiCityNestedOption | null {
  const id = toIdStr(c.id);
  if (!id) return null;
  return { id, ...normalizeLocalizedRefName(c) };
}

function normalizeRegions(rows: SaudiRefRegionRow[]): SaudiRegionOption[] {
  const out: SaudiRegionOption[] = [];
  for (const r of rows) {
    const id = toIdStr(r.id);
    if (!id) continue;
    out.push({
      id,
      ...normalizeLocalizedRefName(r),
      code: r.code?.trim() || undefined,
      cities: (r.cities ?? []).map(normalizeCityNested).filter((c): c is SaudiCityNestedOption => c != null),
    });
  }
  return out;
}

function normalizeCitiesFlat(rows: SaudiRefCityFlat[]): SaudiCityOption[] {
  return rows
    .map((row) => {
      const id = toIdStr(row.id);
      const regionId = toIdStr(row.region_id);
      if (!id || !regionId) return null;
      return { id, regionId, ...normalizeLocalizedRefName(row) };
    })
    .filter((c): c is SaudiCityOption => c != null);
}

function normalizeEventCategories(rows: EventCategoryRow[]): EventCategoryOption[] {
  const out: EventCategoryOption[] = [];
  for (const r of rows) {
    const id = toIdStr(r.id);
    if (!id) continue;
    out.push({
      id,
      slug: r.slug?.trim() || undefined,
      ...normalizeLocalizedRefName({
        name: r.name,
        name_en: r.name_en ?? r.name,
        name_ar: r.name_ar,
      }),
    });
  }
  return out;
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
