import { getMainSiteOrigin } from '@/config/site';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const mainCtaClass =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-white outline-none transition-all hover:bg-ink-80 focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 active:scale-[0.97]';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token'), [params]);
  const main = getMainSiteOrigin();
  const resetHref =
    main && token ? `${main}/reset-password?token=${encodeURIComponent(token)}` : main ? `${main}/reset-password` : null;

  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col justify-center px-6 py-16 lg:px-8">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-ink-10 bg-surface-tint p-8 shadow-card-md">
          <h1 className="text-2xl font-extrabold text-ink">Set new password</h1>
          <p className="mt-2 text-[13px] text-ink-60">
            Complete this step on the main MyTicket site using the link from your email. This organizer app does not change
            passwords directly.
          </p>
          {token ? (
            <p className="mt-4 rounded-xl bg-white px-3 py-2 font-mono text-[11px] text-ink-60 ring-1 ring-ink-10">
              Token received — use the button below to continue on the main site.
            </p>
          ) : null}
          <div className="mt-8">
            {resetHref ? (
              <a href={resetHref} rel="noreferrer" className={mainCtaClass}>
                Continue on main site
              </a>
            ) : (
              <p className="rounded-2xl bg-ink-5 px-4 py-3 text-[13px] text-ink-60">
                Set <code className="font-mono text-[12px] text-ink">VITE_MAIN_SITE_URL</code> in <code className="font-mono text-[12px] text-ink">.env</code> so
                we can send you to the correct reset URL{token ? ' with your token' : ''}.
              </p>
            )}
          </div>
          <Link to="/login" className="mt-6 inline-block text-[13px] font-semibold text-coral hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
