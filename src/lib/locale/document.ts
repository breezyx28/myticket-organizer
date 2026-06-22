import { isRtlLocale, type AppLocale } from '@/config/locale';

export function applyDocumentLocale(locale: AppLocale): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = isRtlLocale(locale) ? 'rtl' : 'ltr';
  root.classList.toggle('locale-ar', locale === 'ar');
  root.classList.toggle('locale-en', locale === 'en');
  document.body.classList.toggle('rtl', isRtlLocale(locale));
}
