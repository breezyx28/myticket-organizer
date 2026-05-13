/** Laravel-style { data: T } or plain T */
export function unwrapEnvelope<T = unknown>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

export function asObjectArray(raw: unknown): unknown[] {
  const inner = unwrapEnvelope(raw);
  if (Array.isArray(inner)) return inner;
  if (inner && typeof inner === 'object') {
    const o = inner as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
  }
  return [];
}

export function readString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string') return v;
  }
  return '';
}

export function readNum(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

/** Integer id fields from Laravel (`region_id`, `city_id`) as decimal string for UI state. */
export function readApiNumericId(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
    if (typeof v === 'string' && /^\d+$/.test(v.trim())) return v.trim();
  }
  return '';
}

export function readBool(obj: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'boolean') return v;
  }
  return undefined;
}

export function toIdString(v: unknown): string {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v;
  return '';
}
