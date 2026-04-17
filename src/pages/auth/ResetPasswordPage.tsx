import { Button } from '@/components/ui/Button';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token'), [params]);
  const [pw, setPw] = useState('');
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDone(true);
  }

  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col justify-center px-6 py-16 lg:px-8">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-ink-10 bg-surface-tint p-8 shadow-card-md">
          <h1 className="text-2xl font-extrabold text-ink">Set new password</h1>
          <p className="mt-2 text-[13px] text-ink-60">
            Token (demo): <code className="rounded bg-white px-2 py-1 font-mono text-[12px]">{token ?? '(none)'}</code>
          </p>
          {done ? (
            <p className="mt-6 rounded-2xl bg-lemon/40 px-4 py-3 text-[14px] font-semibold text-ink">Password updated (mock).</p>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <label className="block">
                <span className="text-[12px] font-semibold text-ink-60">New password</span>
                <input
                  type="password"
                  minLength={8}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-4 py-3 text-[14px] outline-none focus:border-coral"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  required
                />
              </label>
              <Button type="submit" variant="dark" className="w-full" size="lg">
                Save
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
