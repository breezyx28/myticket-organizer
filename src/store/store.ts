import { configureStore } from '@reduxjs/toolkit';
import { organizerApi } from '@/store/api/organizerApi';
import { referenceApi } from '@/store/api/referenceApi';
import authReducer from '@/store/slices/authSlice';

export const store = configureStore({
  reducer: {
    [organizerApi.reducerPath]: organizerApi.reducer,
    [referenceApi.reducerPath]: referenceApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(organizerApi.middleware, referenceApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
