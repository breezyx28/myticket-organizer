import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const ACCESS_TOKEN_STORAGE_KEY = 'myticket_organizer_access_token_v1';

export type AuthState = {
  accessToken: string | null;
};

function loadToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistToken(token: string | null) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (token) sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    else sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const initialState: AuthState = {
  accessToken: loadToken(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessToken(state, action: PayloadAction<string | null>) {
      state.accessToken = action.payload;
      persistToken(action.payload);
    },
  },
});

export const { setAccessToken } = authSlice.actions;
export default authSlice.reducer;
