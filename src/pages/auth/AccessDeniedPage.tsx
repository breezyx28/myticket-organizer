import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { getMainSiteOrigin } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function AccessDeniedPage() {
  const { t } = useTranslation(['auth', 'common']);
  const { signOut, user } = useAuth();
  const main = getMainSiteOrigin();

  return (
    <div className="min-h-dvh bg-surface-dark text-white">
      <div className="absolute end-6 top-6">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto flex min-h-dvh max-w-[720px] flex-col justify-center px-6 py-20">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-card-xl backdrop-blur">
          <h1 className="text-3xl font-extrabold tracking-tight">{t('accessDeniedTitle')}</h1>
          <p className="mt-3 text-[15px] text-white/80">
            {t('accessDeniedSignedIn', { email: user?.email ?? '—' })}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button type="button" variant="primary" onClick={() => signOut()}>
              {t('common:signOut')}
            </Button>
            {main ? (
              <a
                href={main}
                className="inline-flex items-center rounded-full border-2 border-white/30 px-5 py-3 text-[14px] font-semibold hover:bg-white/10"
                rel="noreferrer"
              >
                {t('common:mainWebsite')}
              </a>
            ) : (
              <span className="inline-flex items-center rounded-full border-2 border-white/15 px-5 py-3 text-[14px] font-semibold text-white/50">
                {t('mainSiteUrlHint')}
              </span>
            )}
          </div>
          <p className="mt-6 text-[13px] text-white/60">{t('needOrganizerAccess')}</p>
          <Link to="/login" className="mt-4 inline-block text-[13px] font-semibold text-lemon hover:underline">
            {t('tryDifferentAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
}
