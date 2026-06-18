import { configureStore } from '@reduxjs/toolkit';
import { mainMarketplaceApi } from '@/store/api/mainMarketplaceApi';
import { organizerApi } from '@/store/api/organizerApi';
import { referenceApi } from '@/store/api/referenceApi';
import authReducer from '@/store/slices/authSlice';
import localeReducer from '@/store/slices/localeSlice';
import { rtkToastMiddleware } from '@/store/middleware/rtkToastMiddleware';

export const store = configureStore({
  reducer: {
    [organizerApi.reducerPath]: organizerApi.reducer,
    [referenceApi.reducerPath]: referenceApi.reducer,
    [mainMarketplaceApi.reducerPath]: mainMarketplaceApi.reducer,
    auth: authReducer,
    locale: localeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      organizerApi.middleware,
      referenceApi.middleware,
      mainMarketplaceApi.middleware,
      rtkToastMiddleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
