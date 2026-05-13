import { configureStore } from '@reduxjs/toolkit';
import { organizerApi } from '@/store/api/organizerApi';
import { referenceApi } from '@/store/api/referenceApi';
import authReducer from '@/store/slices/authSlice';
import toastReducer from '@/store/slices/toastSlice';
import { rtkToastMiddleware } from '@/store/middleware/rtkToastMiddleware';

export const store = configureStore({
  reducer: {
    [organizerApi.reducerPath]: organizerApi.reducer,
    [referenceApi.reducerPath]: referenceApi.reducer,
    auth: authReducer,
    toast: toastReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(organizerApi.middleware, referenceApi.middleware, rtkToastMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
