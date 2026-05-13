/** First validation message per Laravel field key from RTK / fetch error payloads. */
export function firstMessagesFromApiError(e: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!e || typeof e !== 'object' || !('data' in e)) return out;
  const data = (e as { data?: { errors?: Record<string, string[] | string> } }).data;
  const errors = data?.errors;
  if (!errors || typeof errors !== 'object') return out;
  for (const [k, v] of Object.entries(errors)) {
    const msg = Array.isArray(v) ? v[0] : String(v);
    if (typeof msg === 'string' && msg.trim()) out[k] = msg.trim();
  }
  return out;
}

export function pickApiFieldMessage(map: Record<string, string>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const m = map[k];
    if (m) return m;
  }
  return undefined;
}
