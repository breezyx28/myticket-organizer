import { Button } from '@/components/ui/Button';
import { cancelEvent } from '@/services/eventsService';
import { useState } from 'react';

export function CancellationFlow({
  eventId,
  eventTitle,
  onDone,
  onClose,
}: {
  eventId: string;
  eventTitle: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [agree, setAgree] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/50 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-ink-10 bg-white p-6 shadow-card-xl">
        {step === 1 ? (
          <>
            <h2 className="text-xl font-extrabold text-ink">Cancel event?</h2>
            <p className="mt-2 text-[14px] text-ink-60">
              You are about to cancel <strong className="text-ink">{eventTitle}</strong>. All tickets will be marked{' '}
              <strong>CANCELLED</strong> and buyers receive cancellation + refund info (simulated). Auction-listed tickets are also cancelled (demo).
            </p>
            <p className="mt-3 rounded-2xl bg-coral/15 px-4 py-3 text-[13px] font-medium text-ink">
              Refund method follows the platform cancellation agreement — details TBD per spec.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button variant="dark" onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-extrabold text-ink">Confirm cancellation</h2>
            <label className="mt-4 flex items-start gap-3 text-[13px] text-ink-60">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
              <span>I understand tickets will be cancelled and attendees notified (demo).</span>
            </label>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="danger" disabled={!agree} onClick={() => { cancelEvent(eventId); onDone(); }}>
                Confirm cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
