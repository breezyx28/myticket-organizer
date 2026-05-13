import { Button } from '@/components/ui/Button';
import { getMainSiteOrigin } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const { user, signIn } = useAuth();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; otp?: string }>({});
  const mainSite = getMainSiteOrigin();

  if (user?.role === 'organizer') {
    return <Navigate to={from} replace />;
  }

  function clearFieldError(key: keyof typeof fieldErrors) {
    setFieldErrors((cur) => {
      const next = { ...cur };
      delete next[key];
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    if (challengeToken) {
      const otpTrim = otp.trim();
      if (!otpTrim) {
        setFieldErrors({ otp: 'Enter the verification code from your authenticator app.' });
        return;
      }
      const res = await signIn({ challengeToken, otp: otpTrim });
      if (!res.ok) {
        if (res.reason === 'two_factor_required') {
          setChallengeToken(res.challengeToken ?? null);
          setFieldErrors({ otp: 'Additional verification required. Enter the new code.' });
        } else if (res.reason === 'not_organizer') {
          setFieldErrors({ email: 'Access denied — this dashboard is for Organizer accounts only.' });
        } else {
          setFieldErrors({ otp: 'Invalid or expired verification code.' });
        }
      } else {
        setChallengeToken(null);
        setOtp('');
      }
      return;
    }

    const next: { email?: string; password?: string } = {};
    const em = email.trim();
    if (!em) next.email = 'Email is required.';
    else if (!emailPattern.test(em)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    if (Object.keys(next).length > 0) {
      setFieldErrors(next);
      return;
    }

    const res = await signIn({ email: em, password });
    if (!res.ok) {
      if (res.reason === 'two_factor_required' && res.challengeToken) {
        setChallengeToken(res.challengeToken);
        setOtp('');
        setFieldErrors({});
        return;
      }
      if (res.reason === 'not_organizer') {
        setFieldErrors({ email: 'Access denied — this dashboard is for Organizer accounts only.' });
      } else {
        const msg = 'Invalid credentials. Check your email and password.';
        setFieldErrors({ email: msg, password: msg });
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
                    className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-[14px] outline-none focus:border-coral focus:ring-2 focus:ring-coral/30 ${
                      fieldErrors.otp ? 'border-coral' : 'border-ink-10'
                    }`}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      clearFieldError('otp');
                    }}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    autoFocus
                  />
                  {fieldErrors.otp ? <p className="mt-1.5 text-[12px] font-medium text-coral">{fieldErrors.otp}</p> : null}
                </label>
              </>
            ) : (
              <>
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink-60">Email</span>
                  <input
                    className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-[14px] outline-none focus:border-coral focus:ring-2 focus:ring-coral/30 ${
                      fieldErrors.email ? 'border-coral' : 'border-ink-10'
                    }`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError('email');
                    }}
                    autoComplete="email"
                  />
                  {fieldErrors.email ? <p className="mt-1.5 text-[12px] font-medium text-coral">{fieldErrors.email}</p> : null}
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink-60">Password</span>
                  <input
                    type="password"
                    className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-[14px] outline-none focus:border-coral focus:ring-2 focus:ring-coral/30 ${
                      fieldErrors.password ? 'border-coral' : 'border-ink-10'
                    }`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError('password');
                    }}
                    autoComplete="current-password"
                  />
                  {fieldErrors.password ? <p className="mt-1.5 text-[12px] font-medium text-coral">{fieldErrors.password}</p> : null}
                </label>
              </>
            )}
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
                  setFieldErrors({});
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
