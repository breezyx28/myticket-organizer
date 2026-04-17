import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

export function LoginPage() {
  const { user, signIn, signInGoogleMock } = useAuth();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('organizer@myticket.demo');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);

  if (user?.role === 'organizer') {
    return <Navigate to={from} replace />;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = signIn({ email, password });
    if (!res.ok) {
      if (res.reason === 'not_organizer') {
        setError('Access denied — this dashboard is for Organizer accounts only.');
      } else {
        setError('Invalid credentials (demo). Use organizer@myticket.demo / password.');
      }
    }
  }

  return (
    <div className="min-h-dvh bg-surface-tint">
      <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col justify-center px-6 py-16 lg:px-8">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-ink-10 bg-white p-8 shadow-card-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Organizer Area</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Sign in</h1>
          <p className="mt-2 text-[14px] text-ink-60">No self-registration — accounts are approved on the main website.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-60">Email</span>
              <input
                className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
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
              />
            </label>
            {error ? <p className="rounded-xl bg-coral/15 px-4 py-3 text-[13px] font-medium text-ink">{error}</p> : null}
            <Button type="submit" variant="dark" className="w-full" size="lg">
              Continue
            </Button>
            <Button type="button" variant="outline" className="w-full" size="lg" onClick={() => signInGoogleMock()}>
              Continue with Google (demo)
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap justify-between gap-2 text-[13px] font-semibold">
            <Link to="/forgot-password" className="text-coral hover:underline">
              Forgot password
            </Link>
            <span className="text-ink-40">Need help? Support (demo)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
