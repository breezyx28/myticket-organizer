import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setLanguage as setLanguageAction } from '@/store/slices/localeSlice';
import { isRtlLocale, type AppLocale } from '@/config/locale';
import { applyDocumentLocale } from '@/lib/locale/document';
import { setApiLanguage } from '@/lib/locale/apiHeaders';
import i18n from '@/i18n';
import { organizerApi } from '@/store/api/organizerApi';
import { referenceApi } from '@/store/api/referenceApi';
import { mainMarketplaceApi } from '@/store/api/mainMarketplaceApi';

export function useLocale() {
  const dispatch = useAppDispatch();
  const language = useAppSelector((s) => s.locale.language);
  const isRtl = isRtlLocale(language);
  const dir = isRtl ? 'rtl' : 'ltr';

  const setLanguage = useCallback(
    (locale: AppLocale) => {
      if (locale === language) return;
      dispatch(setLanguageAction(locale));
      setApiLanguage(locale);
      void i18n.changeLanguage(locale);
      applyDocumentLocale(locale);
      dispatch(organizerApi.util.invalidateTags([
        'Profile',
        'EventList',
        'Event',
        'Notification',
        'Conversation',
        'ConversationUnread',
        'Engagement',
      ]));
      dispatch(referenceApi.util.invalidateTags(['SaudiRegion', 'SaudiCity', 'EventCategory']));
      dispatch(mainMarketplaceApi.util.invalidateTags(['TalentList', 'VendorList', 'Talent', 'Vendor']));
    },
    [dispatch, language]
  );

  return { language, isRtl, dir, setLanguage };
}

export function useDir() {
  const { dir, isRtl } = useLocale();
  return { dir, isRtl };
}
