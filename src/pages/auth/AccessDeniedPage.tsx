import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

export function AccessDeniedPage() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-dvh bg-surface-dark text-white">
      <div className="mx-auto flex min-h-dvh max-w-[720px] flex-col justify-center px-6 py-20">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-card-xl backdrop-blur">
          <h1 className="text-3xl font-extrabold tracking-tight">Access denied</h1>
          <p className="mt-3 text-[15px] text-white/80">
            Signed in as <span className="font-semibold text-white">{user?.email ?? 'unknown'}</span> — this application is restricted to{' '}
            <strong>Organizer</strong> accounts only.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button type="button" variant="primary" onClick={() => signOut()}>
              Sign out
            </Button>
            <a
              href="https://myticket.com"
              className="inline-flex items-center rounded-full border-2 border-white/30 px-5 py-3 text-[14px] font-semibold hover:bg-white/10"
            >
              Main website
            </a>
          </div>
          <p className="mt-6 text-[13px] text-white/60">
            Need organizer access? Complete onboarding on the main site and wait for admin approval (demo).
          </p>
          <Link to="/login" className="mt-4 inline-block text-[13px] font-semibold text-lemon hover:underline">
            Try a different account
          </Link>
        </div>
      </div>
    </div>
  );
}
