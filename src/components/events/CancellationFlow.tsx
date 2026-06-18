import { Button } from '@/components/ui/Button';
import { cancelEvent } from '@/services/eventsService';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation(['events', 'common']);
  const [step, setStep] = useState<1 | 2>(1);
  const [agree, setAgree] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/50 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-ink-10 bg-white p-6 shadow-card-xl">
        {step === 1 ? (
          <>
            <h2 className="text-xl font-extrabold text-ink">{t('cancellation.step1Title')}</h2>
            <p className="mt-2 text-[14px] text-ink-60">
              {t('cancellation.step1Intro')} <strong className="text-ink">{eventTitle}</strong>. {t('cancellation.step1Body')}{' '}
              <strong>{t('cancellation.cancelledStatus')}</strong> {t('cancellation.step1Outro')}
            </p>
            <p className="mt-3 rounded-2xl bg-coral/15 px-4 py-3 text-[13px] font-medium text-ink">{t('cancellation.refundNotice')}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose}>
                {t('close', { ns: 'common' })}
              </Button>
              <Button variant="dark" onClick={() => setStep(2)}>
                {t('continue', { ns: 'common' })}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-extrabold text-ink">{t('cancellation.step2Title')}</h2>
            <label className="mt-4 flex items-start gap-3 text-[13px] text-ink-60">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
              <span>{t('cancellation.agreeLabel')}</span>
            </label>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setStep(1)}>
                {t('back', { ns: 'common' })}
              </Button>
              <Button
                variant="danger"
                disabled={!agree}
                onClick={() => {
                  void (async () => {
                    await cancelEvent(eventId);
                    onDone();
                  })();
                }}
              >
                {t('cancellation.confirmCancel')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
