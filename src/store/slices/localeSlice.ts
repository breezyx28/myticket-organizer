import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { LOCALE_STORAGE_KEY, readStoredLocale, type AppLocale } from '@/config/locale';

type LocaleState = {
  language: AppLocale;
};

const initialState: LocaleState = {
  language: readStoredLocale(),
};

const localeSlice = createSlice({
  name: 'locale',
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<AppLocale>) {
      state.language = action.payload;
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, action.payload);
      } catch {
        /* ignore quota errors */
      }
    },
    hydrateLanguage(state, action: PayloadAction<AppLocale>) {
      state.language = action.payload;
    },
  },
});

export const { setLanguage, hydrateLanguage } = localeSlice.actions;
export default localeSlice.reducer;
