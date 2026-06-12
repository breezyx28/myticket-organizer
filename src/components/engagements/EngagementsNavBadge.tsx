import { organizerApi } from '@/store/api/organizerApi';

export function EngagementsNavBadge() {
  const { data } = organizerApi.useGetConversationsUnreadCountQuery();
  const count = data?.unread_count ?? 0;
  if (count <= 0) return null;
  return (
    <span className="ml-auto rounded-full bg-coral px-2 py-0.5 font-mono text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}
