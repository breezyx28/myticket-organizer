import { describe, expect, it } from 'vitest';
import { safeParseResponse, ResponseParseError } from '@/lib/api/parseResponse';
import { financeSummaryResponseSchema } from '@/schemas/organizer/responses/finance';
import { laravelPaginatorShellSchema } from '@/schemas/organizer/responses/shared';

describe('safeParseResponse', () => {
  it('returns parsed finance summary', () => {
    const raw = {
      gross_total: 100,
      fees_total: 10,
      refunds_total: 5,
      net_total: 85,
      adjustments_total: 0,
    };
    const out = safeParseResponse(financeSummaryResponseSchema, raw, 'summary');
    expect(out.net_total).toBe(85);
  });

  it('throws ResponseParseError on invalid paginator', () => {
    expect(() => safeParseResponse(laravelPaginatorShellSchema, { foo: 1 }, 'paginator')).toThrow(ResponseParseError);
  });
});
