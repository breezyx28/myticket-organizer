import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { getMainSiteOrigin } from '@/config/site';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const mainCtaClass =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-white outline-none transition-all hover:bg-ink-80 focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 active:scale-[0.97]';

export function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token'), [params]);
  const main = getMainSiteOrigin();
  const resetHref =
    main && token ? `${main}/reset-password?token=${encodeURIComponent(token)}` : main ? `${main}/reset-password` : null;

  return (
    <div className="min-h-dvh bg-white">
      <div className="absolute end-6 top-6">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col justify-center px-6 py-16 lg:px-8">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-ink-10 bg-surface-tint p-8 shadow-card-md">
          <h1 className="text-2xl font-extrabold text-ink">{t('setNewPasswordTitle')}</h1>
          <p className="mt-2 text-[13px] text-ink-60">{t('setNewPasswordSubtitle')}</p>
          {token ? (
            <p className="mt-4 rounded-xl bg-white px-3 py-2 font-mono text-[11px] text-ink-60 ring-1 ring-ink-10">
              {t('tokenReceived')}
            </p>
          ) : null}
          <div className="mt-8">
            {resetHref ? (
              <a href={resetHref} rel="noreferrer" className={mainCtaClass}>
                {t('continueOnMainSite')}
              </a>
            ) : (
              <p className="rounded-2xl bg-ink-5 px-4 py-3 text-[13px] text-ink-60">
                {t('resetUrlHint', {
                  tokenSuffix: token ? t('resetUrlHintTokenSuffix') : '',
                })}
              </p>
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
