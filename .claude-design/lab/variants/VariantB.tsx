import { LabShell } from '../components/LabShell';
import {
  ContextBullets,
  EmailStepBlock,
  LoginFormBlock,
  OtpStepBlock,
  ORGANIZER_COPY,
  OrganizerBrandMark,
  PasswordStepBlock,
} from '../components/AuthBlocks';

function SplitPanel({
  step,
  title,
  subtitle,
  children,
}: {
  step?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[280px] grid-cols-1 md:grid-cols-2">
      <aside className="flex flex-col justify-between bg-ink p-5 text-white md:p-6">
        <div>
          <div className="flex items-center gap-2">
            <OrganizerBrandMark size="sm" />
            <span className="text-[13px] font-extrabold">
              MyTicket <span className="text-coral">Organizer</span>
            </span>
          </div>
          {step ? (
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">{step}</p>
          ) : null}
          <h3 className="mt-2 text-xl font-extrabold tracking-tight">{title}</h3>
          <p className="mt-2 text-[12px] leading-relaxed text-white/70">{subtitle}</p>
        </div>
        <ContextBullets inverted />
      </aside>
      <div className="flex items-center p-5 md:p-6">{children}</div>
    </div>
  );
}

export function VariantB() {
  return (
    <LabShell
      label="B"
      title="Split layout"
      rationale="Brand and context on the left, form on the right — reinforces that this is the organizer workspace, not the public site."
      notes="Same split pattern across login and each reset step; collapses to single column on mobile."
    >
      <SplitPanel title={ORGANIZER_COPY.loginTitle} subtitle={ORGANIZER_COPY.loginSubtitle}>
        <div className="w-full max-w-sm">
          <LoginFormBlock />
        </div>
      </SplitPanel>
      <div className="grid gap-px border-t border-ink-10 bg-ink-10 md:grid-cols-3">
        <div className="bg-white">
          <SplitPanel step="Step 1 of 3" title={ORGANIZER_COPY.forgotTitle} subtitle={ORGANIZER_COPY.forgotSubtitle}>
            <div className="w-full">
              <EmailStepBlock compact />
            </div>
          </SplitPanel>
        </div>
        <div className="bg-white md:col-span-1">
          <div className="p-4 md:hidden">
            <p className="text-[10px] font-bold uppercase text-ink-40">Steps 2–3 preview</p>
          </div>
          <SplitPanel step="Step 2 of 3" title={ORGANIZER_COPY.otpTitle} subtitle={ORGANIZER_COPY.otpSubtitle}>
            <div className="w-full">
              <OtpStepBlock compact />
            </div>
          </SplitPanel>
        </div>
        <div className="bg-white">
          <SplitPanel step="Step 3 of 3" title={ORGANIZER_COPY.passwordTitle} subtitle={ORGANIZER_COPY.passwordSubtitle}>
            <div className="w-full">
              <PasswordStepBlock compact />
            </div>
          </SplitPanel>
        </div>
      </div>
    </LabShell>
  );
}
