import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  CalendarDays,
  Archive,
  QrCode,
  LineChart,
  Wallet,
  Star,
  UserRound,
} from 'lucide-react';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_MAIN: NavItem[] = [
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/events/archive', label: 'Archive', icon: Archive },
  { to: '/scanners', label: 'Scanners', icon: QrCode },
  { to: '/analytics/sales', label: 'Sales', icon: LineChart },
  { to: '/analytics/attendance', label: 'Attendance', icon: LineChart },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/ratings', label: 'Ratings', icon: Star },
];
