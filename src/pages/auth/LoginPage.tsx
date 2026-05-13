import { Button } from '@/components/ui/Button';
import { getMainSiteOrigin } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

export function LoginPage() {
  const { user, signIn } = useAuth();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mainSite = getMainSiteOrigin();

  if (user?.role === 'organizer') {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (challengeToken) {
      const res = await signIn({ challengeToken, otp: otp.trim() });
      if (!res.ok) {
        if (res.reason === 'two_factor_required') {
          setChallengeToken(res.challengeToken ?? null);
          setError('Additional verification required. Enter the new code.');
        } else if (res.reason === 'not_organizer') {
          setError('Access denied — this dashboard is for Organizer accounts only.');
        } else {
          setError('Invalid or expired verification code.');
        }
      } else {
        setChallengeToken(null);
        setOtp('');
      }
      return;
    }

    const res = await signIn({ email, password });
    if (!res.ok) {
      if (res.reason === 'two_factor_required' && res.challengeToken) {
        setChallengeToken(res.challengeToken);
        setOtp('');
        setError(null);
        return;
      }
      if (res.reason === 'not_organizer') {
        setError('Access denied — this dashboard is for Organizer accounts only.');
      } else {
        setError('Invalid credentials. Check your email and password.');
      }
    }
  }

  return (
    <div className="min-h-dvh bg-surface-tint">
      <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col justify-center px-6 py-16 lg:px-8">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-ink-10 bg-white p-8 shadow-card-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Organizer Area</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Sign in</h1>
          <p className="mt-2 text-[14px] text-ink-60">No self-registration — organizer accounts are created through the main website.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {challengeToken ? (
              <>
                <p className="rounded-xl bg-indigo/10 px-4 py-3 text-[13px] font-medium text-ink">
                  Two-factor authentication is required. Enter the code from your authenticator app.
                </p>
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink-60">Verification code</span>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    autoFocus
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink-60">Email</span>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink-60">Password</span>
                  <input
                    type="password"
                    className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </label>
              </>
            )}
            {error ? <p className="rounded-xl bg-coral/15 px-4 py-3 text-[13px] font-medium text-ink">{error}</p> : null}
            <Button type="submit" variant="dark" className="w-full" size="lg">
              {challengeToken ? 'Verify and continue' : 'Continue'}
            </Button>
            {challengeToken ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                size="sm"
                onClick={() => {
                  setChallengeToken(null);
                  setOtp('');
                  setError(null);
                }}
              >
                Back to email & password
              </Button>
            ) : null}
          </form>

          <div className="mt-6 flex flex-wrap justify-between gap-2 text-[13px] font-semibold">
            <Link to="/forgot-password" className="text-coral hover:underline">
              Forgot password
            </Link>
            {mainSite ? (
              <a href={mainSite} className="text-ink-60 hover:text-coral hover:underline" rel="noreferrer">
                Main website
              </a>
            ) : (
              <span className="text-[12px] font-medium text-ink-40">Set VITE_MAIN_SITE_URL for a shortcut link.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
