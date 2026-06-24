/** True when `iso` parses to a valid instant. */
export function isValidIso(iso: string): boolean {
  const t = iso.trim();
  if (!t) return false;
  const d = new Date(t);
  return !Number.isNaN(d.getTime());
}

/** `datetime-local` value from an ISO string (browser local timezone). */
export function toLocalInput(iso: string): string {
  if (!isValidIso(iso)) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO string from a `datetime-local` value; empty when invalid. */
export function fromLocalInput(v: string): string {
  const t = v.trim();
  if (!t) return '';
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

/** `date` input value (`YYYY-MM-DD`) from an ISO string. */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso || !isValidIso(iso)) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO string at local start-of-day from a `date` input value. */
export function dateInputToIsoDate(v: string): string {
  const t = v.trim();
  if (!t) return '';
  const d = new Date(`${t}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

/** Normalizes `YYYY-MM-DD` or ISO datetime for ticket sales PATCH fields. */
export function normalizeSalesDateForApi(value: string): string {
  const t = value.trim();
  if (!t) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return dateInputToIsoDate(t);
  if (isValidIso(t)) return new Date(t).toISOString();
  return '';
}
