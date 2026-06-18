import enAuth from '@/i18n/locales/en/auth.json';
import enNav from '@/i18n/locales/en/nav.json';
import enDashboard from '@/i18n/locales/en/dashboard.json';
import enProfile from '@/i18n/locales/en/profile.json';
import enEvents from '@/i18n/locales/en/events.json';
import enScanners from '@/i18n/locales/en/scanners.json';
import enEngagements from '@/i18n/locales/en/engagements.json';
import enMarketplace from '@/i18n/locales/en/marketplace.json';
import enAnalytics from '@/i18n/locales/en/analytics.json';
import enFinance from '@/i18n/locales/en/finance.json';
import enRatings from '@/i18n/locales/en/ratings.json';
import enNotifications from '@/i18n/locales/en/notifications.json';
import enErrors from '@/i18n/locales/en/errors.json';
import enCommon from '@/i18n/locales/en/common.json';

import arAuth from '@/i18n/locales/ar/auth.json';
import arNav from '@/i18n/locales/ar/nav.json';
import arDashboard from '@/i18n/locales/ar/dashboard.json';
import arProfile from '@/i18n/locales/ar/profile.json';
import arEvents from '@/i18n/locales/ar/events.json';
import arScanners from '@/i18n/locales/ar/scanners.json';
import arEngagements from '@/i18n/locales/ar/engagements.json';
import arMarketplace from '@/i18n/locales/ar/marketplace.json';
import arAnalytics from '@/i18n/locales/ar/analytics.json';
import arFinance from '@/i18n/locales/ar/finance.json';
import arRatings from '@/i18n/locales/ar/ratings.json';
import arNotifications from '@/i18n/locales/ar/notifications.json';
import arErrors from '@/i18n/locales/ar/errors.json';
import arCommon from '@/i18n/locales/ar/common.json';

export const i18nResources = {
  en: {
    common: enCommon,
    auth: enAuth,
    nav: enNav,
    dashboard: enDashboard,
    profile: enProfile,
    events: enEvents,
    scanners: enScanners,
    engagements: enEngagements,
    marketplace: enMarketplace,
    analytics: enAnalytics,
    finance: enFinance,
    ratings: enRatings,
    notifications: enNotifications,
    errors: enErrors,
  },
  ar: {
    common: arCommon,
    auth: arAuth,
    nav: arNav,
    dashboard: arDashboard,
    profile: arProfile,
    events: arEvents,
    scanners: arScanners,
    engagements: arEngagements,
    marketplace: arMarketplace,
    analytics: arAnalytics,
    finance: arFinance,
    ratings: arRatings,
    notifications: arNotifications,
    errors: arErrors,
  },
} as const;

export const I18N_NAMESPACES = [
  'common',
  'auth',
  'nav',
  'dashboard',
  'profile',
  'events',
  'scanners',
  'engagements',
  'marketplace',
  'analytics',
  'finance',
  'ratings',
  'notifications',
  'errors',
] as const;
