import i18n from '@/i18n';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  CalendarDays,
  Archive,
  QrCode,
  LineChart,
  Wallet,
  MessageCircle,
  Star,
  UserRound,
} from 'lucide-react';

export type NavItem = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  badge?: 'engagements';
};

export const NAV_MAIN: NavItem[] = [
  { to: '/profile', labelKey: 'items.profile', icon: UserRound },
  { to: '/', labelKey: 'items.home', icon: LayoutDashboard },
  { to: '/events', labelKey: 'items.events', icon: CalendarDays },
  { to: '/events/archive', labelKey: 'items.archive', icon: Archive },
  { to: '/engagements', labelKey: 'items.engagements', icon: MessageCircle, badge: 'engagements' },
  { to: '/scanners', labelKey: 'items.scanners', icon: QrCode },
  { to: '/analytics/sales', labelKey: 'items.sales', icon: LineChart },
  { to: '/analytics/attendance', labelKey: 'items.attendance', icon: LineChart },
  { to: '/finance', labelKey: 'items.finance', icon: Wallet },
  { to: '/ratings', labelKey: 'items.ratings', icon: Star },
];

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export function navLabel(item: NavItem): string {
  return (i18n.t as TranslateFn)(item.labelKey, { ns: 'nav' });
}
