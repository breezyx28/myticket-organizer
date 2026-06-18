import { cn } from '@/lib/utils';
import { useLocale } from '@/hooks/useLocale';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '@/config/locale';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation('common');
  const { language, setLanguage } = useLocale();

  const options: { id: AppLocale; label: string }[] = [
    { id: 'en', label: t('languageEn') },
    { id: 'ar', label: t('languageAr') },
  ];

  return (
    <div
      className={cn('inline-flex rounded-full border border-ink-10 bg-white p-0.5', className)}
      role="group"
      aria-label={t('languageSwitcher')}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setLanguage(opt.id)}
          className={cn(
            'min-w-[2.75rem] rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors',
            language === opt.id ? 'bg-ink text-white' : 'text-ink-60 hover:bg-ink-5 hover:text-ink'
          )}
          aria-pressed={language === opt.id}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
