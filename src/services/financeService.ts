import type { FinanceSnapshot } from '@/types/domain';
import { readNum, readString, toIdString } from '@/lib/api/json';
import { organizerApi } from '@/store/api/organizerApi';
import type { LaravelPaginatorUnknown } from '@/schemas/organizer/responses/shared';
import { apiDispatch, apiUnwrap } from '@/services/apiDispatch';

const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));

const emptyFinance: FinanceSnapshot = {
  gross: 0,
  platformFees: 0,
  net: 0,
  refunds: 0,
  adjustments: 0,
  payoutStatus: 'held',
};

export async function getFinance(): Promise<FinanceSnapshot> {
  await delay();
  try {
    return await apiUnwrap<FinanceSnapshot>(apiDispatch(organizerApi.endpoints.getFinanceSummary.initiate()));
  } catch {
    return emptyFinance;
  }
}

/** CSV string from GET /me/finance/exports (includes header). */
export async function getFinanceExportsCsv(): Promise<string> {
  const res = await apiUnwrap<{ csv: string }>(apiDispatch(organizerApi.endpoints.getFinanceExports.initiate()));
  return res.csv;
}

export function downloadFinanceCsv(csv: string, filename = 'finance-export.csv') {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

export type BankAccountRowView = {
  id: string;
  bankName: string;
  masked: string;
  currency: string;
  isDefault: boolean;
};

export async function listBankAccountsForFinance(): Promise<BankAccountRowView[]> {
  try {
    const rows = await apiUnwrap<unknown[]>(apiDispatch(organizerApi.endpoints.listBankAccounts.initiate()));
    if (!Array.isArray(rows)) return [];
    return rows.map((row, i) => {
      const o = asRecord(row) ?? {};
      const id = toIdString(o.id) || String(i);
      const bankName = readString(o, 'bank_name', 'bankName', 'name', 'label') || 'Bank account';
      const last4 = readString(o, 'iban_last4', 'ibanLast4', 'account_last4', 'last4');
      const iban = readString(o, 'iban', 'account_number', 'accountNumber');
      const masked =
        last4 ? `···${last4}` : iban.length > 6 ? `${iban.slice(0, 4)}···${iban.slice(-4)}` : iban || '—';
      const currency = readString(o, 'currency', 'ccy') || 'SAR';
      const isDefault = Boolean(o.is_default ?? o.isDefault ?? o.default);
      return { id, bankName, masked, currency, isDefault };
    });
  } catch {
    return [];
  }
}

export type PayoutRowView = {
  id: string;
  status: string;
  amount: string;
  at: string;
};

export async function listPayoutsPageForFinance(page = 1): Promise<{ rows: PayoutRowView[]; shell: LaravelPaginatorUnknown | null }> {
  try {
    const shell = await apiUnwrap<LaravelPaginatorUnknown>(
      apiDispatch(organizerApi.endpoints.listPayouts.initiate({ page }))
    );
    const rows: PayoutRowView[] = (shell.data ?? []).map((row, i) => {
      const o = asRecord(row) ?? {};
      const id = toIdString(o.id) || String(i);
      const status = readString(o, 'status', 'state') || '—';
      const amountNum = readNum(o, 'amount', 'total', 'net_amount', 'gross_amount');
      const amount = amountNum != null ? `SAR ${amountNum.toLocaleString()}` : readString(o, 'amount_display', 'amountDisplay') || '—';
      const at = readString(o, 'created_at', 'createdAt', 'paid_at', 'paidAt') || '—';
      return { id, status, amount, at };
    });
    return { rows, shell };
  } catch {
    return { rows: [], shell: null };
  }
}
