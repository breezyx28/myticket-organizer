import { LabShell } from '../components/LabShell';
import {
  EmailStepBlock,
  FlowStrip,
  LoginFormBlock,
  OtpStepBlock,
  ORGANIZER_COPY,
  PasswordStepBlock,
} from '../components/AuthBlocks';

function Screen({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-10 bg-white p-4">
      <h3 className="text-[15px] font-extrabold text-ink">{title}</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-60">{subtitle}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function VariantA() {
  return (
    <LabShell
      label="A"
      title="Clear hierarchy"
      rationale="Headlines lead, helper text supports. One primary action per screen — best for busy organizers who scan quickly."
      notes="Login card full-size; reset flow shown as four labeled screens below."
    >
      <div className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-40">{ORGANIZER_COPY.loginEyebrow}</p>
        <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{ORGANIZER_COPY.loginTitle}</h3>
        <p className="mt-2 max-w-sm text-[13px] text-ink-60">{ORGANIZER_COPY.loginSubtitle}</p>
        <div className="mt-6 max-w-sm">
          <LoginFormBlock />
        </div>
      </div>
      <FlowStrip
        renderStep={(id) => {
          if (id === 'login') {
            return (
              <Screen title={ORGANIZER_COPY.loginTitle} subtitle="Email + password">
                <LoginFormBlock compact />
              </Screen>
            );
          }
          if (id === 'email') {
            return (
              <Screen title={ORGANIZER_COPY.forgotTitle} subtitle={ORGANIZER_COPY.forgotSubtitle}>
                <EmailStepBlock compact />
              </Screen>
            );
          }
          if (id === 'otp') {
            return (
              <Screen title={ORGANIZER_COPY.otpTitle} subtitle={ORGANIZER_COPY.otpSubtitle}>
                <OtpStepBlock compact />
              </Screen>
            );
          }
          return (
            <Screen title={ORGANIZER_COPY.passwordTitle} subtitle={ORGANIZER_COPY.passwordSubtitle}>
              <PasswordStepBlock compact />
            </Screen>
          );
        }}
      />
    </LabShell>
  );
}
