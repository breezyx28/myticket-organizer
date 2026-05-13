import { getMainSiteOrigin } from '@/config/site';
import { Link } from 'react-router-dom';

const mainCtaClass =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-white outline-none transition-all hover:bg-ink-80 focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 active:scale-[0.97]';

export function ForgotPasswordPage() {
  const main = getMainSiteOrigin();
  const forgotHref = main ? `${main}/forgot-password` : null;

  return (
    <div className="min-h-dvh bg-surface-warm">
      <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col justify-center px-6 py-16 lg:px-8">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-ink-10 bg-white p-8 shadow-card-lg">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Reset password</h1>
          <p className="mt-2 text-[14px] text-ink-60">
            Organizer password reset is handled on the main MyTicket site, not in this dashboard.
          </p>
          <div className="mt-8 space-y-4">
            {forgotHref ? (
              <a href={forgotHref} rel="noreferrer" className={mainCtaClass}>
                Open password reset on main site
              </a>
            ) : (
              <p className="rounded-2xl bg-ink-5 px-4 py-3 text-[13px] text-ink-60">
                Configure <code className="font-mono text-[12px] text-ink">VITE_MAIN_SITE_URL</code> in your{' '}
                <code className="font-mono text-[12px] text-ink">.env</code> (see <code className="font-mono text-[12px] text-ink">.env.example</code>)
                so this button links to the correct reset page.
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
