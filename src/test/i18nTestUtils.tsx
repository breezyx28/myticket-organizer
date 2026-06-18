import { render, type RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import type { ReactElement, ReactNode } from 'react';
import { Provider, type ProviderProps } from 'react-redux';
import type { AppLocale } from '@/config/locale';
import i18n from '@/i18n';
import { applyDocumentLocale } from '@/lib/locale/document';
import { setApiLanguage } from '@/lib/locale/apiHeaders';
import { store } from '@/store/store';

type RenderWithI18nOptions = Omit<RenderOptions, 'wrapper'> & {
  locale?: AppLocale;
  store?: ProviderProps['store'];
  wrapper?: ({ children }: { children: ReactNode }) => ReactElement;
};

export async function setupI18nTest(locale: AppLocale = 'en'): Promise<void> {
  setApiLanguage(locale);
  applyDocumentLocale(locale);
  await i18n.changeLanguage(locale);
}

export function renderWithI18n(ui: ReactElement, options: RenderWithI18nOptions = {}) {
  const { locale = 'en', store: testStore = store, wrapper: Outer, ...renderOptions } = options;

  void setupI18nTest(locale);

  function Wrapper({ children }: { children: ReactNode }) {
    const content = Outer ? <Outer>{children}</Outer> : children;
    return (
      <Provider store={testStore}>
        <I18nextProvider i18n={i18n}>{content}</I18nextProvider>
      </Provider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
