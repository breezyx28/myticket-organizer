import { ApiBaseUrl } from '@/config/api';

export const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ApiBaseUrl;

export const reverbConfig = {
  key: (import.meta.env.VITE_REVERB_APP_KEY as string) || 'fysuwmddunkddyla1das',
  host: (import.meta.env.VITE_REVERB_HOST as string) || 'myticket-api.kat-jr.com',
  port: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
  scheme: ((import.meta.env.VITE_REVERB_SCHEME as string) ?? 'https') as 'http' | 'https',
};

export const ORGANIZER_API_PREFIX = '/api/v1/organizer';

export function apiPath(appPrefix: string, path: string): string {
  return `${apiUrl}${appPrefix}${path}`;
}
