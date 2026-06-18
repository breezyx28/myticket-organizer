import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ApiBaseUrl, MAIN_API_PREFIX } from '@/config/api';
import {
  mapApiTalentDetail,
  mapApiTalentsList,
  mapApiVendorDetail,
  mapApiVendorsList,
} from '@/lib/api/mapMarketplace';
import { appendAcceptLanguage } from '@/lib/locale/apiHeaders';
import type { TalentListing, VendorListing } from '@/types/domain';

export type TalentListParams = {
  page?: number;
  per_page?: number;
  talent_category_id?: string;
  region_id?: string;
  city_id?: string;
  search?: string;
};

export type VendorListParams = {
  page?: number;
  per_page?: number;
  service_category_id?: string;
  region_id?: string;
  city_id?: string;
  search?: string;
};

/** @deprecated Use TalentListParams or VendorListParams */
export type MarketplaceListParams = TalentListParams & VendorListParams;

function mainPath(path: string) {
  return `${MAIN_API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildTalentQuery(params?: TalentListParams) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.per_page) sp.set('per_page', String(params.per_page));
  if (params?.talent_category_id) sp.set('talent_category_id', params.talent_category_id);
  if (params?.region_id) sp.set('region_id', params.region_id);
  if (params?.city_id) sp.set('city_id', params.city_id);
  if (params?.search?.trim()) sp.set('search', params.search.trim());
  const q = sp.toString();
  return q ? `?${q}` : '';
}

function buildVendorQuery(params?: VendorListParams) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.per_page) sp.set('per_page', String(params.per_page));
  if (params?.service_category_id) sp.set('service_category_id', params.service_category_id);
  if (params?.region_id) sp.set('region_id', params.region_id);
  if (params?.city_id) sp.set('city_id', params.city_id);
  if (params?.search?.trim()) sp.set('search', params.search.trim());
  const q = sp.toString();
  return q ? `?${q}` : '';
}

export const mainMarketplaceApi = createApi({
  reducerPath: 'mainMarketplaceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: ApiBaseUrl,
    prepareHeaders: (headers, { getState }) => {
      headers.set('Accept', 'application/json');
      appendAcceptLanguage(headers, getState);
      return headers;
    },
  }),
  tagTypes: ['TalentList', 'VendorList', 'Talent', 'Vendor'],
  endpoints: (builder) => ({
    listTalents: builder.query<TalentListing[], TalentListParams | void>({
      query: (params) => `${mainPath('/talents')}${buildTalentQuery(params ?? undefined)}`,
      transformResponse: (raw: unknown) => mapApiTalentsList(raw),
      providesTags: [{ type: 'TalentList', id: 'LIST' }],
    }),
    getTalent: builder.query<TalentListing | null, string>({
      query: (slug) => mainPath(`/talents/${encodeURIComponent(slug)}`),
      transformResponse: (raw: unknown) => mapApiTalentDetail(raw),
      providesTags: (_r, _e, slug) => [{ type: 'Talent', id: slug }],
    }),
    listVendors: builder.query<VendorListing[], VendorListParams | void>({
      query: (params) => `${mainPath('/vendors')}${buildVendorQuery(params ?? undefined)}`,
      transformResponse: (raw: unknown) => mapApiVendorsList(raw),
      providesTags: [{ type: 'VendorList', id: 'LIST' }],
    }),
    getVendor: builder.query<VendorListing | null, string>({
      query: (slug) => mainPath(`/vendors/${encodeURIComponent(slug)}`),
      transformResponse: (raw: unknown) => mapApiVendorDetail(raw),
      providesTags: (_r, _e, slug) => [{ type: 'Vendor', id: slug }],
    }),
  }),
});

export const {
  useListTalentsQuery,
  useGetTalentQuery,
  useListVendorsQuery,
  useGetVendorQuery,
} = mainMarketplaceApi;
