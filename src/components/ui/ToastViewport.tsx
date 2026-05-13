import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeToast } from '@/store/slices/toastSlice';

const TOAST_LIFETIME_MS = 2800;

export function ToastViewport() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((s) => s.toast.items);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => {
        dispatch(removeToast(t.id));
      }, TOAST_LIFETIME_MS)
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [dispatch, toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-[84px] z-[160] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-card-sm ${
            t.tone === 'success'
              ? 'border-mint/40 bg-mint/10 text-mint-dark'
              : 'border-coral/45 bg-coral/10 text-coral'
          }`}
          role="status"
          aria-live="polite"
        >
          <p className="text-[13px] font-semibold">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
