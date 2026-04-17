import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="min-h-dvh bg-surface-warm">
      <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col justify-center px-6 py-16 lg:px-8">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-ink-10 bg-white p-8 shadow-card-lg">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Reset password</h1>
          <p className="mt-2 text-[14px] text-ink-60">Demo only — no email is sent.</p>
          {sent ? (
            <p className="mt-6 rounded-2xl bg-mint/25 px-4 py-3 text-[14px] font-medium text-ink">
              If an organizer account exists for <strong>{email || 'that address'}</strong>, you’ll get reset instructions (simulated).
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">Email</span>
                <input
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] outline-none focus:border-coral"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <Button type="submit" variant="dark" className="w-full" size="lg">
                Send link
              </Button>
            </form>
          )}
          <Link to="/login" className="mt-6 inline-block text-[13px] font-semibold text-coral hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
