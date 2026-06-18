import {
  fetchBaseQuery,
  type BaseQueryFn,
  type BaseQueryApi,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { ApiBaseUrl, ORGANIZER_API_PREFIX } from '@/config/api';
import { extractAccessTokenFromLoginResponse } from '@/lib/api/extractAuth';
import { refreshTokenResponseSchema } from '@/schemas/organizer/responses/auth';
import { appendAcceptLanguage } from '@/lib/locale/apiHeaders';
import { setAccessToken } from '@/store/slices/authSlice';

const PUBLIC_ENDPOINTS = new Set(['login', 'oauthCallback', 'health', 'version']);

/** Do not chain refresh when these endpoints return 401 (invalid credentials, loop guard). */
const NO_REFRESH_ON_401 = new Set(['login', 'oauthCallback', 'health', 'version', 'refresh', 'logout']);

function parseRefreshBody(data: unknown): string | null {
  const parsed = refreshTokenResponseSchema.safeParse(data);
  if (parsed.success) return parsed.data.token;
  return extractAccessTokenFromLoginResponse(data);
}

let refreshInFlight: Promise<string | null> | null = null;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: ApiBaseUrl,
  prepareHeaders: (headers, { getState, endpoint }) => {
    if (!PUBLIC_ENDPOINTS.has(String(endpoint))) {
      const token = (getState() as { auth?: { accessToken?: string | null } }).auth?.accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Accept', 'application/json');
    appendAcceptLanguage(headers, getState);
    return headers;
  },
});

function scheduleRefresh(api: BaseQueryApi, extraOptions: object): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const result = await rawBaseQuery(
          {
            url: `${ORGANIZER_API_PREFIX}/auth/refresh`,
            method: 'POST',
          },
          api,
          extraOptions
        );
        if (result.error) {
          api.dispatch(setAccessToken(null));
          return null;
        }
        const token = parseRefreshBody(result.data);
        api.dispatch(setAccessToken(token));
        return token;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export const organizerBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status !== 401) return result;

  if (NO_REFRESH_ON_401.has(String(api.endpoint))) return result;

  const token = await scheduleRefresh(api, (extraOptions ?? {}) as object);
  if (!token) return result;

  result = await rawBaseQuery(args, api, extraOptions);
  return result;
};
