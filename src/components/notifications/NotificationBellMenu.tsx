import { getNotificationEventId, isAdminEventNotification } from '@/lib/api/mapNotification';
import { cn } from '@/lib/utils';
import { organizerApi } from '@/store/api/organizerApi';
import type { AdminEventNotificationAction, OrganizerNotification } from '@/types/domain';
import {
  Bell,
  Check,
  CheckCircle2,
  Loader2,
  Pin,
  PinOff,
  Star,
  StarOff,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';

import { formatRelative } from '@/lib/locale/format';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

function actionIcon(action: AdminEventNotificationAction | undefined): ReactNode {
  const className = 'h-4 w-4 shrink-0';
  switch (action) {
    case 'approved':
      return <CheckCircle2 className={cn(className, 'text-mint')} strokeWidth={2} />;
    case 'rejected':
      return <XCircle className={cn(className, 'text-coral')} strokeWidth={2} />;
    case 'featured':
      return <Star className={cn(className, 'text-amber')} strokeWidth={2} />;
    case 'unfeatured':
      return <StarOff className={cn(className, 'text-ink-40')} strokeWidth={2} />;
    case 'pinned':
      return <Pin className={cn(className, 'text-indigo')} strokeWidth={2} />;
    case 'unpinned':
      return <PinOff className={cn(className, 'text-ink-40')} strokeWidth={2} />;
    default:
      return <Bell className={cn(className, 'text-ink-60')} strokeWidth={2} />;
  }
}

function notificationAction(n: OrganizerNotification): AdminEventNotificationAction | undefined {
  const data = n.data;
  if (data && typeof data === 'object' && 'admin_action' in data) {
    return (data as { admin_action: AdminEventNotificationAction }).admin_action;
  }
  return undefined;
}

export function NotificationBellMenu() {
  const { t } = useTranslation(['notifications', 'common']);
  const { language } = useLocale();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading, isFetching, isError, refetch } = organizerApi.useListNotificationsQuery(
    { page: 1 },
    { pollingInterval: open ? 30_000 : 90_000 }
  );

  const [markRead] = organizerApi.useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = organizerApi.useMarkAllNotificationsReadMutation();

  const items = data?.data ?? [];
  const unreadCount = data?.unread_count ?? items.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function handleSelect(n: OrganizerNotification) {
    if (!n.isRead) {
      try {
        await markRead(n.id).unwrap();
      } catch {
        /* still navigate on failure */
      }
    }
    setOpen(false);
    const eventId = getNotificationEventId(n);
    if (eventId) {
      navigate(`/events/${eventId}`);
      return;
    }
    if (n.href?.startsWith('/events/')) {
      const id = n.href.replace(/^\/events\//, '').split('/')[0];
      if (id) navigate(`/events/${id}`);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t('bell.ariaLabel')}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void refetch();
        }}
        className={cn(
          'relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-10 bg-white text-ink-60 transition-colors hover:bg-ink-5 hover:text-ink',
          open && 'border-ink-20 bg-ink-5 text-ink'
        )}
      >
        <Bell size={16} strokeWidth={2} />
        {unreadCount > 0 ? (
          <span className="absolute -end-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 z-[100] mt-2 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-ink-10 bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-ink-10 px-4 py-3">
            <div>
              <p className="text-[14px] font-bold text-ink">{t('menu.title')}</p>
              <p className="text-[11px] text-ink-40">{t('menu.subtitle')}</p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                disabled={markingAll}
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-ink-60 transition-colors hover:bg-ink-5 hover:text-ink disabled:opacity-50"
              >
                {markingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                {t('menu.markAllRead')}
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(70dvh,420px)] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-[13px] text-ink-40">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('menu.loading')}
              </div>
            ) : isError ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] font-semibold text-ink">{t('error.title')}</p>
                <p className="mt-1 text-[12px] text-ink-40">{t('error.subtitle')}</p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-3 rounded-full border border-ink-10 px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-ink-5"
                >
                  {t('error.retry')}
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[13px] font-semibold text-ink">{t('empty.title')}</p>
                <p className="mt-1 text-[12px] text-ink-40">{t('empty.subtitle')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-ink-10">
                {items.map((n) => {
                  const action = notificationAction(n);
                  const adminEvent = isAdminEventNotification(n);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void handleSelect(n)}
                        className={cn(
                          'flex w-full gap-3 px-4 py-3 text-start transition-colors hover:bg-ink-5',
                          !n.isRead && 'bg-lemon/15'
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-10 bg-white',
                            adminEvent && action === 'rejected' && 'border-coral/20 bg-coral/5'
                          )}
                        >
                          {actionIcon(action)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className={cn('text-[13px] font-semibold text-ink', !n.isRead && 'text-ink')}>
                              {n.title}
                            </span>
                            <span className="shrink-0 text-[10px] font-medium text-ink-40">
                              {formatRelative(n.createdAt, language, t as TranslateFn)}
                            </span>
                          </span>
                          {n.body ? (
                            <span className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-60">{n.body}</span>
                          ) : null}
                        </span>
                        {!n.isRead ? (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-coral" aria-hidden />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {isFetching && !isLoading ? (
            <div className="border-t border-ink-10 px-4 py-2 text-center text-[10px] font-medium text-ink-40">
              {t('menu.refreshing')}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
