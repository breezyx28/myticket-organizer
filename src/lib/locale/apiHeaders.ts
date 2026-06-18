import type { AppLocale } from '@/config/locale';
import type { RootState } from '@/store/store';

let currentApiLanguage: AppLocale = 'en';

export function setApiLanguage(locale: AppLocale): void {
  currentApiLanguage = locale;
}

export function getApiLanguage(): AppLocale {
  return currentApiLanguage;
}

export function appendAcceptLanguage(headers: Headers, getState?: () => unknown): void {
  const fromState = (getState?.() as RootState | undefined)?.locale?.language;
  const lang = fromState ?? currentApiLanguage;
  headers.set('Accept-Language', lang);
}
