import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ToastTone = 'success' | 'error';

export type ToastItem = {
  id: string;
  tone: ToastTone;
  message: string;
  dedupeKey?: string;
  createdAt: number;
};

type ToastState = {
  items: ToastItem[];
  lastShownAtByKey: Record<string, number>;
};

const DEDUPE_WINDOW_MS = 1500;

const initialState: ToastState = {
  items: [],
  lastShownAtByKey: {},
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    enqueueToast: (
      state,
      action: PayloadAction<{ tone: ToastTone; message: string; dedupeKey?: string }>
    ) => {
      const now = Date.now();
      const dedupeKey = action.payload.dedupeKey?.trim() || undefined;
      if (dedupeKey) {
        const last = state.lastShownAtByKey[dedupeKey] ?? 0;
        if (now - last < DEDUPE_WINDOW_MS) return;
        state.lastShownAtByKey[dedupeKey] = now;
      }
      state.items.push({
        id: `toast_${now}_${Math.random().toString(36).slice(2, 8)}`,
        tone: action.payload.tone,
        message: action.payload.message,
        dedupeKey,
        createdAt: now,
      });
      if (state.items.length > 4) state.items = state.items.slice(-4);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
  },
});

export const { enqueueToast, removeToast } = toastSlice.actions;
export default toastSlice.reducer;
