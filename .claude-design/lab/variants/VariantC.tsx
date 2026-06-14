import { LabShell } from '../components/LabShell';
import {
  EmailStepBlock,
  LoginFormBlock,
  OtpStepBlock,
  ORGANIZER_COPY,
  OrganizerBrandMark,
  PasswordStepBlock,
} from '../components/AuthBlocks';

function CompactScreen({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-ink-10 px-4 py-3 last:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-40">{label}</span>
        <span className="text-[12px] font-bold text-ink">{title}</span>
      </div>
      {children}
    </section>
  );
}

export function VariantC() {
  return (
    <LabShell
      label="C"
      title="Compact density"
      rationale="Tighter vertical rhythm for organizers who sign in daily — more screens visible without scrolling on laptop viewports."
      notes="Smaller type scale and padding; still uses label-above-input pattern."
    >
      <div className="flex items-center gap-2 border-b border-ink-10 px-4 py-3">
        <OrganizerBrandMark size="sm" />
        <div>
          <p className="text-[12px] font-extrabold text-ink">MyTicket Organizer</p>
          <p className="text-[10px] text-ink-40">Sign in · Reset password</p>
        </div>
      </div>
      <CompactScreen label="Login" title={ORGANIZER_COPY.loginTitle}>
        <p className="mb-2 text-[11px] text-ink-60">{ORGANIZER_COPY.loginSubtitle}</p>
        <LoginFormBlock compact />
      </CompactScreen>
      <CompactScreen label="Step 1" title={ORGANIZER_COPY.forgotTitle}>
        <EmailStepBlock compact />
      </CompactScreen>
      <CompactScreen label="Step 2" title={ORGANIZER_COPY.otpTitle}>
        <OtpStepBlock compact />
      </CompactScreen>
      <CompactScreen label="Step 3" title={ORGANIZER_COPY.passwordTitle}>
        <PasswordStepBlock compact />
      </CompactScreen>
    </LabShell>
  );
}
