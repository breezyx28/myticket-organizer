import { EngagementThreadPanel } from '@/components/engagements/EngagementThreadPanel';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function EngagementThreadPage() {
  const { t } = useTranslation('engagements');
  const { conversationId } = useParams();
  const navigate = useNavigate();

  if (!conversationId) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center p-8 text-center text-[14px] text-ink-50">
        {t('inbox.selectPrompt')}
      </div>
    );
  }

  return (
    <EngagementThreadPanel
      conversationId={conversationId}
      onBack={() => navigate('/engagements')}
    />
  );
}
