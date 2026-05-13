import { z } from 'zod';

/** Minimal Laravel paginator (validates envelope; item array is unknown until mapped). */
export const laravelPaginatorShellSchema = z
  .object({
    data: z.array(z.unknown()),
    current_page: z.coerce.number(),
    last_page: z.coerce.number(),
    per_page: z.coerce.number(),
    total: z.coerce.number(),
    first_page_url: z.string().nullable().optional(),
    last_page_url: z.string().nullable().optional(),
    next_page_url: z.string().nullable().optional(),
    prev_page_url: z.string().nullable().optional(),
    path: z.string().optional(),
    from: z.coerce.number().nullable().optional(),
    to: z.coerce.number().nullable().optional(),
    links: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const messageResponseSchema = z.object({
  message: z.string(),
});

export const dataEnvelopeUnknownSchema = z.object({
  data: z.unknown(),
});

export const dataArrayEnvelopeSchema = z.object({
  data: z.array(z.unknown()),
});

/** Single model with id — extend in mappers. */
export const entityWithIdSchema = z.object({ id: z.coerce.number() }).passthrough();

export const laravel422ErrorSchema = z.object({
  message: z.string(),
  errors: z.record(z.array(z.string())).optional(),
});

export type LaravelPaginatorUnknown = z.infer<typeof laravelPaginatorShellSchema>;
