import type { AppLocale } from '@/config/locale';

function intlLocale(locale: AppLocale): string {
  return locale === 'ar' ? 'ar-SA' : 'en-US';
}

export function formatDateTime(iso: string, locale: AppLocale, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(intlLocale(locale), options);
}

export function formatDate(iso: string, locale: AppLocale, options?: Intl.DateTimeFormatOptions): string {
  return formatDateTime(iso, locale, { year: 'numeric', month: 'short', day: 'numeric', ...options });
}

export function formatTime(iso: string, locale: AppLocale): string {
  return formatDateTime(iso, locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatNumber(value: number, locale: AppLocale, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(intlLocale(locale), options);
}

export function localeCompareStrings(a: string, b: string, locale: AppLocale): number {
  return a.localeCompare(b, intlLocale(locale));
}

export type RelativeTimeTranslator = (key: string, options?: { count?: number }) => string;

export function formatRelative(iso: string, locale: AppLocale, t: RelativeTimeTranslator): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return t('time.justNow');
  if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
  return formatDateTime(iso, locale, { month: 'short', day: 'numeric' });
}
