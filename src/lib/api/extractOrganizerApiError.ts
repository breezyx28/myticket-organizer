import i18n from '@/i18n';
import { formatApiFieldKey } from '@/lib/i18n/apiFieldLabel';

/** RTK Query / fetchBaseQuery error shape from organizer API (Laravel validation). */
export function formatOrganizerApiError(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: { message?: string; errors?: Record<string, string[] | string> } }).data;
    if (data?.message) return data.message;
    if (data?.errors && typeof data.errors === 'object') {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(data.errors)) {
        const label = formatApiFieldKey(k);
        const msgs = Array.isArray(v) ? v : [String(v)];
        for (const m of msgs) parts.push(`${label}: ${m}`);
      }
      if (parts.length) return parts.join(' ');
    }
  }
  if (e instanceof Error) return e.message;
  return i18n.t('api.requestFailed', { ns: 'errors' });
}
