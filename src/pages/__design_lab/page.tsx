import { VariantA } from '../../../.claude-design/lab/variants/VariantA';
import { VariantB } from '../../../.claude-design/lab/variants/VariantB';
import { VariantC } from '../../../.claude-design/lab/variants/VariantC';
import { VariantD } from '../../../.claude-design/lab/variants/VariantD';
import { VariantE } from '../../../.claude-design/lab/variants/VariantE';
import { FeedbackOverlay } from './FeedbackOverlay';

export function DesignLabPage() {
  return (
    <div data-feedback-root className="min-h-[100dvh] bg-surface-tint">
      <header className="border-b border-ink-10 bg-white px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-coral">Design Lab</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Organizer auth redesign</h1>
          <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-ink-60">
            Compare five directions for <strong className="font-semibold text-ink">login</strong> and a{' '}
            <strong className="font-semibold text-ink">3-step password reset</strong> (email → verify OTP → new password).
            Restrained, organizer-meaningful — no decorative overload.
          </p>
          <ul className="mt-4 grid gap-2 text-[13px] text-ink-60 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <span className="font-bold text-ink">A</span> — Clear hierarchy
            </li>
            <li>
              <span className="font-bold text-ink">B</span> — Split layout
            </li>
            <li>
              <span className="font-bold text-ink">C</span> — Compact density
            </li>
            <li>
              <span className="font-bold text-ink">D</span> — Step progress (interactive preview)
            </li>
            <li>
              <span className="font-bold text-ink">E</span> — Organizer context cues
            </li>
          </ul>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <p className="mb-8 text-[13px] font-medium text-ink-40">
          Use the feedback button (bottom-right) to comment on specific elements, then paste results in chat.
        </p>
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
          <div data-variant="A">
            <VariantA />
          </div>
          <div data-variant="B">
            <VariantB />
          </div>
          <div data-variant="C">
            <VariantC />
          </div>
          <div data-variant="D">
            <VariantD />
          </div>
          <div data-variant="E" className="xl:col-span-2">
            <VariantE />
          </div>
        </div>
      </main>

      <FeedbackOverlay targetName="OrganizerAuth" />
    </div>
  );
}
