import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { MOCK_EMAIL, ORGANIZER_COPY, RESET_STEPS } from '../data/fixtures';
import { ArrowLeft, CalendarDays, Mail, ShieldCheck, Ticket } from 'lucide-react';
const inputClass =
  'mt-1.5 w-full rounded-xl border border-ink-10 px-4 py-3 text-[14px] outline-none transition focus:border-coral focus:ring-2 focus:ring-coral/30';

export function LoginFormBlock({ compact = false }: { compact?: boolean }) {
  return (
    <form className={compact ? 'space-y-3' : 'space-y-4'} onSubmit={(e) => e.preventDefault()}>
      <label className="block">
        <span className="text-[12px] font-semibold text-ink-60">Email</span>
        <input className={inputClass} defaultValue={MOCK_EMAIL} autoComplete="email" data-testid="login-email" />
      </label>
      <label className="block">
        <span className="text-[12px] font-semibold text-ink-60">Password</span>
        <PasswordInput className={inputClass} defaultValue="••••••••" autoComplete="current-password" />
      </label>
      <Button type="submit" variant="dark" className="w-full" size={compact ? 'md' : 'lg'}>
        Continue
      </Button>
      <div className="flex justify-between text-[13px] font-semibold">
        <span className="text-coral">Forgot password</span>
        <span className="text-ink-60">Main website</span>
      </div>
    </form>
  );
}

export function EmailStepBlock({ compact = false }: { compact?: boolean }) {
  return (
    <form className={compact ? 'space-y-3' : 'space-y-4'} onSubmit={(e) => e.preventDefault()}>
      <label className="block">
        <span className="text-[12px] font-semibold text-ink-60">Organizer email</span>
        <input className={inputClass} placeholder="you@venue.co" data-testid="forgot-email" />
        <p className="mt-1.5 text-[12px] text-ink-40">Must match the email on your approved organizer profile.</p>
      </label>
      <Button type="submit" variant="dark" className="w-full" size={compact ? 'md' : 'lg'}>
        Send verification code
      </Button>
      <button type="button" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-60 hover:text-coral">
        <ArrowLeft size={14} strokeWidth={2} aria-hidden />
        Back to sign in
      </button>
    </form>
  );
}

export function OtpStepBlock({ compact = false }: { compact?: boolean }) {
  return (
    <form className={compact ? 'space-y-3' : 'space-y-4'} onSubmit={(e) => e.preventDefault()}>
      <label className="block">
        <span className="text-[12px] font-semibold text-ink-60">Verification code</span>
        <input
          className={`${inputClass} font-mono tracking-[0.3em]`}
          placeholder="000000"
          inputMode="numeric"
          maxLength={6}
          data-testid="forgot-otp"
        />
      </label>
      <Button type="submit" variant="dark" className="w-full" size={compact ? 'md' : 'lg'}>
        Verify code
      </Button>
      <p className="text-[12px] text-ink-40">
        Did not receive it? <button type="button" className="font-semibold text-coral">Resend code</button> in 0:47
      </p>
    </form>
  );
}

export function PasswordStepBlock({ compact = false }: { compact?: boolean }) {
  return (
    <form className={compact ? 'space-y-3' : 'space-y-4'} onSubmit={(e) => e.preventDefault()}>
      <label className="block">
        <span className="text-[12px] font-semibold text-ink-60">New password</span>
        <PasswordInput className={inputClass} autoComplete="new-password" />
      </label>
      <label className="block">
        <span className="text-[12px] font-semibold text-ink-60">Confirm password</span>
        <PasswordInput className={inputClass} autoComplete="new-password" />
      </label>
      <Button type="submit" variant="dark" className="w-full" size={compact ? 'md' : 'lg'}>
        Update password
      </Button>
    </form>
  );
}

export function StepProgress({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Password reset progress">
      {RESET_STEPS.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                active ? 'bg-coral text-white' : done ? 'bg-ink text-white' : 'bg-ink-5 text-ink-40'
              }`}
            >
              {i + 1}
            </span>
            <span className={`hidden text-[11px] font-semibold sm:inline ${active ? 'text-ink' : 'text-ink-40'}`}>
              {step.label}
            </span>
            {i < RESET_STEPS.length - 1 ? <span className="h-px flex-1 bg-ink-10" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function OrganizerBrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-9 w-9 rounded-xl' : 'h-10 w-10 rounded-2xl';
  const icon = size === 'sm' ? 16 : 18;
  return (
    <span className={`flex ${box} items-center justify-center bg-lemon shadow-card-sm ring-1 ring-ink/5`}>
      <Ticket size={icon} strokeWidth={2} className="text-ink" aria-hidden />
    </span>
  );
}

export function ContextBullets({ inverted = false }: { inverted?: boolean }) {
  const textClass = inverted ? 'text-white/70' : 'text-ink-60';
  return (
    <ul className={`space-y-3 text-[13px] ${textClass}`}>
      <li className="flex gap-2">
        <CalendarDays size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-coral" aria-hidden />
        Manage live events, ticket types, and gate assignments from one place.
      </li>
      <li className="flex gap-2">
        <ShieldCheck size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-coral" aria-hidden />
        Organizer-only access — customer accounts cannot sign in here.
      </li>
      <li className="flex gap-2">
        <Mail size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-coral" aria-hidden />
        Password reset stays in-dashboard with email verification.
      </li>
    </ul>
  );
}

export function FlowStrip({
  renderStep,
}: {
  renderStep: (step: 'login' | 'email' | 'otp' | 'password', label: string) => React.ReactNode;
}) {
  const screens: Array<{ id: 'login' | 'email' | 'otp' | 'password'; label: string }> = [
    { id: 'login', label: 'Login' },
    { id: 'email', label: '1. Email' },
    { id: 'otp', label: '2. OTP' },
    { id: 'password', label: '3. Password' },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 border-t border-ink-10 bg-surface-tint/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
      {screens.map((s) => (
        <div key={s.id} className="min-w-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-40">{s.label}</p>
          {renderStep(s.id, s.label)}
        </div>
      ))}
    </div>
  );
}

export { ORGANIZER_COPY, MOCK_EMAIL };
