import { NAV_MAIN, navLabel } from '@/config/nav';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { getProfile } from '@/services/profileService';
import { EngagementsNavBadge } from '@/components/engagements/EngagementsNavBadge';
import { NotificationBellMenu } from '@/components/notifications/NotificationBellMenu';
import { LayoutDashboard, LogOut, Menu, Ticket, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

function isDisplayableImageUrl(url: string) {
  return /^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:');
}

function initialsFrom(displayName: string, email: string) {
  const n = displayName.trim();
  if (n.length >= 2) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  const local = email.split('@')[0] ?? 'OR';
  return local.slice(0, 2).toUpperCase() || 'OR';
}

export function OrganizerShell({ children }: { children?: ReactNode }) {
  const { t } = useTranslation(['nav', 'common']);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [sidebarProfile, setSidebarProfile] = useState<{ displayName: string; avatarUrl: string | null }>({
    displayName: '',
    avatarUrl: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadSidebarProfile() {
      const profile = await getProfile();
      if (cancelled) return;
      const logo = profile.logoUrl?.trim() ?? '';
      const profileImage = profile.profileImageUrl?.trim() ?? '';
      const avatarCandidate = profileImage || logo;
      setSidebarProfile({
        displayName: profile.displayName?.trim() || profile.name || user?.name || '',
        avatarUrl: avatarCandidate && isDisplayableImageUrl(avatarCandidate) ? avatarCandidate : null,
      });
    }
    void loadSidebarProfile();
    function onDashboardChanged() {
      void loadSidebarProfile();
    }
    window.addEventListener('organizer-dashboard-changed', onDashboardChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('organizer-dashboard-changed', onDashboardChanged);
    };
  }, [location.pathname, user?.name]);

  return (
    <div className="min-h-dvh bg-surface-page text-ink">
      <header className="sticky top-0 z-50 h-[72px] border-b border-ink-10 bg-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.04)] backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-full items-center justify-between px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex rounded-full border border-ink-10 p-2 md:hidden"
              aria-label={t('nav:aria.openMenu')}
              onClick={() => setOpen(true)}
            >
              <Menu size={20} strokeWidth={2} />
            </button>
            <NavLink to="/" className="flex items-center gap-2 font-extrabold tracking-tight text-ink">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lemon shadow-card-sm ring-1 ring-ink/5">
                <Ticket size={18} strokeWidth={2} className="text-ink" />
              </span>
              <span className="leading-tight">
                {t('common:appName')} <span className="text-coral">{t('common:appNameAccent')}</span>
              </span>
            </NavLink>
            <span className="hidden rounded-full border border-ink-10 bg-ink-5 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-60 lg:inline-flex">
              {t('common:dashboard')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <NotificationBellMenu />
            <div className="hidden items-center gap-2 md:flex">
              <NavLink
                to="/"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-ink-10 bg-white px-4 text-[13px] font-semibold text-ink-60 transition-colors hover:bg-ink-5 hover:text-ink"
              >
                <LayoutDashboard size={16} strokeWidth={2} />
                {t('common:overview')}
              </NavLink>
              <div className="ms-1 rounded-2xl border border-ink-10 bg-white px-3 py-1.5">
                <p className="max-w-[220px] truncate text-[12px] font-semibold text-ink">{user?.email}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-ink-40">{t('common:organizerAccount')}</p>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-ink bg-white px-4 text-[13px] font-semibold shadow-sm transition-colors hover:bg-ink-5"
              >
                <LogOut size={16} strokeWidth={2} />
                {t('common:signOut')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={cn(
            'fixed inset-y-0 start-0 z-40 w-[86%] max-w-[320px] bg-white/95 p-6 transition-transform',
            'md:top-[72px] md:z-30 md:w-72 md:max-w-none md:translate-x-0 md:overflow-y-auto md:border-e md:border-ink-10 md:bg-white md:p-5 md:pt-6',
            open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-auto md:translate-x-0'
          )}
        >
          <div className="mb-6 flex items-center justify-between md:hidden">
            <p className="text-sm font-bold">{t('common:menu')}</p>
            <button
              type="button"
              className="rounded-full p-2 hover:bg-ink-5"
              aria-label={t('nav:aria.closeMenu')}
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="mb-4 sm:hidden">
            <LanguageSwitcher className="w-full justify-center" />
          </div>
          <nav className="space-y-1">
            {NAV_MAIN.map((item) => {
              const isProfile = item.to === '/profile';
              const initials = initialsFrom(sidebarProfile.displayName || user?.name || '', user?.email ?? '');
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-semibold transition-colors',
                      isActive ? 'bg-ink text-white shadow-card-md' : 'text-ink-60 hover:bg-ink-5 hover:text-ink',
                      isProfile && isActive && 'ring-2 ring-coral/40 ring-offset-2 ring-offset-white'
                    )
                  }
                >
                  {isProfile ? (
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-lemon/90 to-coral/25 text-[11px] font-bold text-ink shadow-inner ring-2 ring-white"
                      aria-hidden
                    >
                      {sidebarProfile.avatarUrl ? (
                        <img src={sidebarProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </span>
                  ) : (
                    <item.icon size={18} strokeWidth={2} />
                  )}
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate">{navLabel(item)}</span>
                    {item.badge === 'engagements' ? <EngagementsNavBadge /> : null}
                  </span>
                </NavLink>
              );
            })}
          </nav>
          <div className="mt-8 rounded-2xl border border-ink-10 bg-ink-5/60 p-4 md:hidden">
            <button
              type="button"
              onClick={() => {
                signOut();
                setOpen(false);
              }}
              className="w-full rounded-full bg-ink py-3 text-sm font-semibold text-white"
            >
              {t('common:signOut')}
            </button>
          </div>
        </aside>

        <main className="min-h-[calc(100dvh-72px)] flex-1 px-4 py-10 md:ms-72 md:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-[1280px]">{children ?? <Outlet />}</div>
        </main>
      </div>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          aria-label={t('nav:aria.closeOverlay')}
          onClick={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
