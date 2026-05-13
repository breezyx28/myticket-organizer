import type { FinanceSnapshot } from '@/types/domain';
import { readNum, readString, unwrapEnvelope } from '@/lib/api/json';
import { financeSummaryResponseSchema } from '@/schemas/organizer/responses/finance';

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

/** Maps GET /me/finance/summary per ORGANIZER_API_ENDPOINTS.md; keeps legacy keys as fallback. */
export function mapApiFinanceSummary(raw: unknown): FinanceSnapshot {
  const docParsed = financeSummaryResponseSchema.safeParse(raw);
  if (docParsed.success) {
    const d = docParsed.data;
    return {
      gross: d.gross_total,
      platformFees: d.fees_total,
      net: d.net_total,
      refunds: d.refunds_total,
      adjustments: d.adjustments_total,
      payoutStatus: 'held',
    };
  }

  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw) ?? {};
  const payoutRaw = readString(root, 'payout_status', 'payoutStatus').toLowerCase();
  let payoutStatus: FinanceSnapshot['payoutStatus'] = 'held';
  if (payoutRaw === 'scheduled' || payoutRaw === 'paid' || payoutRaw === 'held') payoutStatus = payoutRaw;

  const refundBreakdownRaw = root.refund_breakdown ?? root.refundBreakdown;
  const refundBreakdown: FinanceSnapshot['refundBreakdown'] = [];
  if (Array.isArray(refundBreakdownRaw)) {
    for (const row of refundBreakdownRaw) {
      const o = asRecord(row);
      if (!o) continue;
      refundBreakdown.push({
        reason: readString(o, 'reason', 'label'),
        amount: readNum(o, 'amount') ?? 0,
      });
    }
  }

  const feeAdjustmentsRaw = root.fee_adjustments ?? root.feeAdjustments;
  const feeAdjustments: FinanceSnapshot['feeAdjustments'] = [];
  if (Array.isArray(feeAdjustmentsRaw)) {
    for (const row of feeAdjustmentsRaw) {
      const o = asRecord(row);
      if (!o) continue;
      feeAdjustments.push({
        label: readString(o, 'label', 'reason'),
        amount: readNum(o, 'amount') ?? 0,
      });
    }
  }

  return {
    gross: readNum(root, 'gross_total', 'gross', 'gross_revenue', 'total_gross') ?? 0,
    platformFees: readNum(root, 'fees_total', 'platform_fees', 'platformFees', 'fees') ?? 0,
    net: readNum(root, 'net_total', 'net', 'net_revenue') ?? 0,
    refunds: readNum(root, 'refunds_total', 'refunds') ?? 0,
    adjustments: readNum(root, 'adjustments_total') ?? undefined,
    payoutStatus,
    refundBreakdown: refundBreakdown.length ? refundBreakdown : undefined,
    feeAdjustments: feeAdjustments.length ? feeAdjustments : undefined,
  };
}
