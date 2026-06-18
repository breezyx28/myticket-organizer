import 'i18next';
import { i18nResources } from '@/i18n/resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof i18nResources)['en'];
  }
}
