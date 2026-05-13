/** RTK Query / fetchBaseQuery error shape from organizer API (Laravel validation). */
export function formatOrganizerApiError(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: { message?: string; errors?: Record<string, string[] | string> } }).data;
    if (data?.message) return data.message;
    if (data?.errors && typeof data.errors === 'object') {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(data.errors)) {
        const msgs = Array.isArray(v) ? v : [String(v)];
        for (const m of msgs) parts.push(`${k}: ${m}`);
      }
      if (parts.length) return parts.join(' ');
    }
  }
  if (e instanceof Error) return e.message;
  return 'Request failed.';
}
