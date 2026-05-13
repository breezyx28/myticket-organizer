import type { ZodError, ZodType } from 'zod';

export class ResponseParseError extends Error {
  constructor(
    message: string,
    public readonly zodError?: ZodError
  ) {
    super(message);
    this.name = 'ResponseParseError';
  }
}

/** Strict parse: throws ResponseParseError on failure (surfaces in RTK Query). */
export function safeParseResponse<T>(schema: ZodType<T>, raw: unknown, context?: string): T {
  const r = schema.safeParse(raw);
  if (!r.success) {
    throw new ResponseParseError(context ?? 'Response validation failed', r.error);
  }
  return r.data;
}

/** Laravel paginator: top-level `data` array + meta fields. */
export type PaginatorShape<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  first_page_url?: string | null;
  last_page_url?: string | null;
  next_page_url?: string | null;
  prev_page_url?: string | null;
  path?: string;
  from?: number | null;
  to?: number | null;
  links?: unknown[];
};

export function extractPaginatorData<T>(raw: unknown): { page: PaginatorShape<T>; items: T[] } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.data)) return null;
  if (typeof o.current_page !== 'number') return null;
  return {
    page: o as unknown as PaginatorShape<T>,
    items: o.data as T[],
  };
}

/** `{ data: T }` single resource (not paginator). */
export function extractDataField<T = unknown>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const d = (raw as Record<string, unknown>).data;
  if (d === undefined) return null;
  return d as T;
}

/** `{ message: string }` */
export function extractMessage(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = (raw as Record<string, unknown>).message;
  return typeof m === 'string' ? m : null;
}

/** Top-level JSON array */
export function ensureRawArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  return [];
}
