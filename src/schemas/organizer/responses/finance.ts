import { z } from 'zod';

/** GET /me/finance/summary — top-level fields per ORGANIZER_API_ENDPOINTS.md */
export const financeSummaryResponseSchema = z.object({
  gross_total: z.coerce.number(),
  fees_total: z.coerce.number(),
  refunds_total: z.coerce.number(),
  net_total: z.coerce.number(),
  adjustments_total: z.coerce.number(),
});

export const financeExportsResponseSchema = z.object({
  csv: z.string(),
});

export const bankAccountSchema = z.object({ id: z.coerce.number() }).passthrough();
export const kycDocumentSchema = z.object({ id: z.coerce.number() }).passthrough();
export const payoutSchema = z.object({ id: z.coerce.number() }).passthrough();
