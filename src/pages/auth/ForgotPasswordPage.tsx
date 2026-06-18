import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { getMainSiteOrigin } from '@/config/site';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const mainCtaClass =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-white outline-none transition-all hover:bg-ink-80 focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 active:scale-[0.97]';

export function ForgotPasswordPage() {
  const { t } = useTranslation(['auth', 'common']);
  const main = getMainSiteOrigin();
  const forgotHref = main ? `${main}/forgot-password` : null;

  return (
    <div className="min-h-dvh bg-surface-warm">
      <div className="absolute end-6 top-6">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col justify-center px-6 py-16 lg:px-8">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-ink-10 bg-white p-8 shadow-card-lg">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t('resetPasswordTitle')}</h1>
          <p className="mt-2 text-[14px] text-ink-60">{t('resetOnMainSite')}</p>
          <div className="mt-8 space-y-4">
            {forgotHref ? (
              <a href={forgotHref} rel="noreferrer" className={mainCtaClass}>
                {t('openResetOnMainSite')}
              </a>
            ) : (
              <p className="rounded-2xl bg-ink-5 px-4 py-3 text-[13px] text-ink-60">{t('mainSiteResetHint')}</p>
            )}
          </div>
          <Link to="/login" className="mt-6 inline-block text-[13px] font-semibold text-coral hover:underline">
            {t('backToSignIn')}
          </Link>
        </div>
      </div>
    </div>
  );
}
