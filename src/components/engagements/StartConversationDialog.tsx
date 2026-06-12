import { Button } from '@/components/ui/Button';
import { ScannerDialogOverlay, ScannerFormLabel, scannerInputErrorClass } from '@/components/scanners/scannerUi';
import { createConversation, postConversationMessage } from '@/services/conversationsService';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import { toast } from '@/lib/appToast';
import type { TalentListing, VendorListing } from '@/types/domain';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [brief, setBrief] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open || !target) return null;

  const defaultTopic = eventTitle ? `${kind === 'talent' ? 'Talent' : 'Vendor'} for ${eventTitle}` : '';

  return (
    <ScannerDialogOverlay>
      <h3 className="text-xl font-extrabold text-ink">Request {kind}</h3>
      <p className="mt-2 text-[14px] text-ink-60">
        Start a hiring conversation with <strong className="text-ink">{target.displayName}</strong>. They will receive a
        notification and can reply in chat.
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
                topic: topic.trim() || defaultTopic || `Request ${target.displayName}`,
                brief: brief.trim() || undefined,
                eventId,
              });
              if (initialMessage.trim()) {
                await postConversationMessage(conv.id, initialMessage.trim());
              }
              toast.success('Request sent. Continue in Engagements.');
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
          Topic
          <input
            className={scannerInputErrorClass(false)}
            value={topic}
            placeholder={defaultTopic || 'e.g. Wedding singer'}
            onChange={(e) => setTopic(e.target.value)}
          />
        </ScannerFormLabel>
        <ScannerFormLabel>
          Brief (optional)
          <textarea
            className={`${scannerInputErrorClass(false)} min-h-[88px] resize-y py-2`}
            value={brief}
            placeholder="Describe what you need, dates, budget, etc."
            onChange={(e) => setBrief(e.target.value)}
          />
        </ScannerFormLabel>
        <ScannerFormLabel>
          First message (optional)
          <textarea
            className={`${scannerInputErrorClass(false)} min-h-[72px] resize-y py-2`}
            value={initialMessage}
            placeholder="Hi, are you available for our event?"
            onChange={(e) => setInitialMessage(e.target.value)}
          />
        </ScannerFormLabel>
        <div className="flex flex-col-reverse gap-2 border-t border-ink-10 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="dark" size="md" disabled={busy}>
            {busy ? 'Sending…' : 'Send request'}
          </Button>
        </div>
      </form>
    </ScannerDialogOverlay>
  );
}
