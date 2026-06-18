import { useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { applyDocumentLocale } from '@/lib/locale/document';
import { setApiLanguage } from '@/lib/locale/apiHeaders';
import i18n from '@/i18n';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const language = useAppSelector((s) => s.locale.language);

  useEffect(() => {
    setApiLanguage(language);
    applyDocumentLocale(language);
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language]);

  return children;
}
