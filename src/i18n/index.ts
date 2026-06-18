import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, readStoredLocale } from '@/config/locale';
import { applyDocumentLocale } from '@/lib/locale/document';
import { setApiLanguage } from '@/lib/locale/apiHeaders';
import { I18N_NAMESPACES, i18nResources } from '@/i18n/resources';

const initialLocale = readStoredLocale();
setApiLanguage(initialLocale);
applyDocumentLocale(initialLocale);

void i18n.use(initReactI18next).init({
  resources: i18nResources,
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  defaultNS: 'common',
  ns: [...I18N_NAMESPACES],
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;
