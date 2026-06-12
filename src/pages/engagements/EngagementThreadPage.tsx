import { EngagementThreadPanel } from '@/components/engagements/EngagementThreadPanel';
import { useNavigate, useParams } from 'react-router-dom';

export function EngagementThreadPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  if (!conversationId) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center p-8 text-center text-[14px] text-ink-50">
        Select a conversation to view messages.
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
