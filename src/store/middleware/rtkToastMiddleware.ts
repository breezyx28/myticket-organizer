import type { Middleware } from '@reduxjs/toolkit';
import { enqueueToast } from '@/store/slices/toastSlice';

const SUCCESS_MESSAGES: Record<string, string> = {
  createEvent: 'Event created successfully.',
  submitEvent: 'Event submitted for review.',
  cancelEvent: 'Event cancelled successfully.',
  archiveEvent: 'Event archived successfully.',
  deleteEvent: 'Event deleted successfully.',
};

const ERROR_ENDPOINTS = new Set(Object.keys(SUCCESS_MESSAGES));

function isMutationLifecycle(action: unknown): action is {
  type: string;
  meta?: { arg?: { endpointName?: string; type?: string } };
  payload?: unknown;
  error?: { message?: string };
} {
  if (!action || typeof action !== 'object') return false;
  const a = action as { type?: string; meta?: { arg?: { type?: string } } };
  if (typeof a.type !== 'string') return false;
  if (!a.type.endsWith('/fulfilled') && !a.type.endsWith('/rejected')) return false;
  return a.meta?.arg?.type === 'mutation';
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const p = payload as { data?: unknown };
  if (p.data && typeof p.data === 'object') {
    const d = p.data as { message?: unknown; error?: unknown };
    if (typeof d.message === 'string' && d.message.trim()) return d.message;
    if (typeof d.error === 'string' && d.error.trim()) return d.error;
  }
  return fallback;
}

export const rtkToastMiddleware: Middleware = () => (next) => (action) => {
  const result = next(action);
  if (!isMutationLifecycle(action)) return result;

  const endpointName = action.meta?.arg?.endpointName ?? '';
  if (!endpointName) return result;

  if (action.type.endsWith('/fulfilled')) {
    const msg = SUCCESS_MESSAGES[endpointName];
    if (!msg) return result;
    const dedupeKey = `ok:${endpointName}`;
    next(enqueueToast({ tone: 'success', message: msg, dedupeKey }));
    return result;
  }

  if (!ERROR_ENDPOINTS.has(endpointName)) return result;
  const fallback = action.error?.message || 'Request failed.';
  const msg = extractErrorMessage(action.payload, fallback);
  const dedupeKey = `err:${endpointName}:${msg}`;
  next(enqueueToast({ tone: 'error', message: msg, dedupeKey }));
  return result;
};
