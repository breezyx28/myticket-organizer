import { Button } from '@/components/ui/Button';
import { ScannerDialogOverlay, ScannerFormLabel, scannerInputErrorClass } from '@/components/scanners/scannerUi';
import { createConversation, postConversationMessage } from '@/services/conversationsService';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import { toast } from '@/lib/appToast';
import type { TalentListing, VendorListing } from '@/types/domain';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function StartConversationDialog({
  open,
  target,
  kind,
  eventId,
  eventTitle,
  onClose,
}: {
  open: boolean;
  target: TalentListing | VendorListing | null;
  kind: 'talent' | 'vendor';
  eventId?: string;
  eventTitle?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation(['engagements', 'common']);
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [brief, setBrief] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open || !target) return null;

  const defaultTopic = eventTitle
    ? t(`startDialog.defaultTopic.${kind}`, { eventTitle })
    : '';
  const subjectPlaceholder = defaultTopic || t('startDialog.subjectPlaceholder');

  return (
    <ScannerDialogOverlay>
      <h3 className="text-xl font-extrabold text-ink">{t('startDialog.title')}</h3>
      <p className="mt-2 text-[14px] text-ink-60">
        {t('startDialog.description', { name: target.displayName })}
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void (async () => {
            setBusy(true);
            try {
              const conv = await createConversation({
                targetType: kind,
                targetId: target.profileId,
                topic: topic.trim() || defaultTopic || t('startDialog.fallbackTopic', { name: target.displayName }),
                brief: brief.trim() || undefined,
                eventId,
              });
              if (initialMessage.trim()) {
                await postConversationMessage(conv.id, initialMessage.trim());
              }
              toast.success(t('startDialog.success'));
              onClose();
              navigate(`/engagements/${conv.id}`);
            } catch (err) {
              toast.error(formatOrganizerApiError(err));
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <ScannerFormLabel>
          {t('startDialog.subject')}
          <input
            className={scannerInputErrorClass(false)}
            value={topic}
            placeholder={subjectPlaceholder}
            onChange={(e) => setTopic(e.target.value)}
          />
        </ScannerFormLabel>
        <ScannerFormLabel>
          {t('startDialog.brief')}
          <textarea
            className={`${scannerInputErrorClass(false)} min-h-[88px] resize-y py-2`}
            value={brief}
            placeholder={t('startDialog.briefPlaceholder')}
            onChange={(e) => setBrief(e.target.value)}
          />
        </ScannerFormLabel>
        <ScannerFormLabel>
          {t('startDialog.message')}
          <textarea
            className={`${scannerInputErrorClass(false)} min-h-[72px] resize-y py-2`}
            value={initialMessage}
            placeholder={t('startDialog.messagePlaceholder')}
            onChange={(e) => setInitialMessage(e.target.value)}
          />
        </ScannerFormLabel>
        <div className="flex flex-col-reverse gap-2 border-t border-ink-10 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={busy}>
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button type="submit" variant="dark" size="md" disabled={busy}>
            {busy ? t('startDialog.sending') : t('startDialog.submit')}
          </Button>
        </div>
      </form>
    </ScannerDialogOverlay>
  );
}
