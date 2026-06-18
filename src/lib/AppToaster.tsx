import { useLocale } from '@/hooks/useLocale';
import { Toaster as SonnerToaster } from 'sonner';

export function AppToaster() {
  const { isRtl } = useLocale();

  return (
    <SonnerToaster
      position={isRtl ? 'top-left' : 'top-right'}
      richColors
      closeButton
      duration={4000}
      offset={{ top: '5.5rem' }}
      toastOptions={{
        classNames: {
          toast: 'rounded-xl border border-ink-10 shadow-card-sm font-sans',
          title: 'text-[13px] font-semibold',
          description: 'text-[12px] text-ink-60',
        },
      }}
    />
  );
}
