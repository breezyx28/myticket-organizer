import { LabShell } from '../components/LabShell';
import {
  EmailStepBlock,
  LoginFormBlock,
  MOCK_EMAIL,
  OtpStepBlock,
  ORGANIZER_COPY,
  OrganizerBrandMark,
  PasswordStepBlock,
} from '../components/AuthBlocks';
import { BarChart3, ScanLine, Users } from 'lucide-react';

function AccentCard({ children, accent = 'coral' }: { children: React.ReactNode; accent?: 'coral' | 'lemon' }) {
  const bar = accent === 'coral' ? 'bg-coral' : 'bg-lemon';
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-10 bg-white">
      <div className={`absolute left-0 top-0 h-full w-1 ${bar}`} aria-hidden />
      <div className="pl-5">{children}</div>
    </div>
  );
}

const OPS_CHIPS = [
  { icon: BarChart3, label: 'Sales & attendance' },
  { icon: ScanLine, label: 'Live gate scans' },
  { icon: Users, label: 'Talent & vendors' },
] as const;

export function VariantE() {
  return (
    <LabShell
      label="E"
      title="Organizer context"
      rationale="Subtle operational cues (what you unlock after sign-in) without decorative noise — meaningful, not flashy."
      notes="Left accent bar + ops chips on login; reset steps use email context callouts."
    >
      <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-[1.1fr_0.9fr]">
        <AccentCard>
          <div className="py-5 pr-5">
            <div className="flex items-center gap-2">
              <OrganizerBrandMark />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-40">{ORGANIZER_COPY.loginEyebrow}</p>
            </div>
            <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">{ORGANIZER_COPY.loginTitle}</h3>
            <p className="mt-2 text-[13px] text-ink-60">{ORGANIZER_COPY.loginSubtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {OPS_CHIPS.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-10 bg-surface-tint px-3 py-1.5 text-[11px] font-semibold text-ink-60"
                >
                  <Icon size={13} strokeWidth={2} aria-hidden />
                  {label}
                </span>
              ))}
            </div>
            <div className="mt-6 max-w-sm">
              <LoginFormBlock />
            </div>
          </div>
        </AccentCard>

        <div className="space-y-3">
          <AccentCard accent="lemon">
            <div className="py-4 pr-4">
              <p className="text-[10px] font-bold uppercase text-ink-40">Step 1 · Email</p>
              <h4 className="mt-1 text-[15px] font-extrabold text-ink">{ORGANIZER_COPY.forgotTitle}</h4>
              <div className="mt-3">
                <EmailStepBlock compact />
              </div>
            </div>
          </AccentCard>
          <AccentCard>
            <div className="py-4 pr-4">
              <p className="text-[10px] font-bold uppercase text-ink-40">Step 2 · Verify</p>
              <h4 className="mt-1 text-[15px] font-extrabold text-ink">{ORGANIZER_COPY.otpTitle}</h4>
              <p className="mt-1 rounded-lg bg-ink-5 px-3 py-2 font-mono text-[11px] text-ink-60">{MOCK_EMAIL}</p>
              <div className="mt-3">
                <OtpStepBlock compact />
              </div>
            </div>
          </AccentCard>
          <AccentCard accent="lemon">
            <div className="py-4 pr-4">
              <p className="text-[10px] font-bold uppercase text-ink-40">Step 3 · Password</p>
              <h4 className="mt-1 text-[15px] font-extrabold text-ink">{ORGANIZER_COPY.passwordTitle}</h4>
              <div className="mt-3">
                <PasswordStepBlock compact />
              </div>
            </div>
          </AccentCard>
        </div>
      </div>
    </LabShell>
  );
}
