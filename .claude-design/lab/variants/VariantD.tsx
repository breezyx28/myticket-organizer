import { Button } from '@/components/ui/Button';
import { LabShell } from '../components/LabShell';
import {
  EmailStepBlock,
  LoginFormBlock,
  OtpStepBlock,
  ORGANIZER_COPY,
  OrganizerBrandMark,
  PasswordStepBlock,
  StepProgress,
} from '../components/AuthBlocks';
import { useState } from 'react';

type FlowView = 'login' | 'email' | 'otp' | 'password';

const VIEW_META: Record<FlowView, { title: string; subtitle: string; stepIndex: number }> = {
  login: { title: ORGANIZER_COPY.loginTitle, subtitle: ORGANIZER_COPY.loginSubtitle, stepIndex: -1 },
  email: { title: ORGANIZER_COPY.forgotTitle, subtitle: ORGANIZER_COPY.forgotSubtitle, stepIndex: 0 },
  otp: { title: ORGANIZER_COPY.otpTitle, subtitle: ORGANIZER_COPY.otpSubtitle, stepIndex: 1 },
  password: { title: ORGANIZER_COPY.passwordTitle, subtitle: ORGANIZER_COPY.passwordSubtitle, stepIndex: 2 },
};

function InteractiveFlow() {
  const [view, setView] = useState<FlowView>('login');
  const meta = VIEW_META[view];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-2">
        <OrganizerBrandMark size="sm" />
        <span className="text-[13px] font-extrabold text-ink">
          MyTicket <span className="text-coral">Organizer</span>
        </span>
      </div>

      {view !== 'login' ? (
        <div className="mb-6">
          <StepProgress activeIndex={meta.stepIndex} />
        </div>
      ) : null}

      <h3 className="text-xl font-extrabold tracking-tight text-ink">{meta.title}</h3>
      <p className="mt-1 text-[13px] text-ink-60">{meta.subtitle}</p>

      <div className="mt-5 max-w-sm">
        {view === 'login' ? <LoginFormBlock /> : null}
        {view === 'email' ? <EmailStepBlock /> : null}
        {view === 'otp' ? <OtpStepBlock /> : null}
        {view === 'password' ? <PasswordStepBlock /> : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-ink-10 pt-4">
        <p className="w-full text-[10px] font-bold uppercase tracking-wide text-ink-40">Preview navigation (lab only)</p>
        {(['login', 'email', 'otp', 'password'] as FlowView[]).map((v) => (
          <Button
            key={v}
            type="button"
            size="sm"
            variant={view === v ? 'dark' : 'outline'}
            onClick={() => setView(v)}
          >
            {v === 'login' ? 'Login' : v}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function VariantD() {
  return (
    <LabShell
      label="D"
      title="Step progress model"
      rationale="Numbered progress across the three reset pages reduces anxiety — organizers always know where they are in the flow."
      notes="Interactive tabs let you click through login → email → OTP → password in this preview."
    >
      <InteractiveFlow />
    </LabShell>
  );
}
