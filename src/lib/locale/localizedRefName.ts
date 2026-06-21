import type { AppLocale } from '@/config/locale';

export type LocalizedRefName = {
  /** Locale-aware label from API (`Accept-Language`). */
  name: string;
  nameEn: string;
  nameAr: string;
};

type LocalizedRefNameInput = {
  name: string;
  name_en?: string;
  name_ar?: string;
};

export function normalizeLocalizedRefName(raw: LocalizedRefNameInput): LocalizedRefName {
  const name = raw.name.trim();
  const nameEn = (raw.name_en ?? raw.name).trim();
  const nameAr = (raw.name_ar ?? raw.name).trim();
  return { name, nameEn, nameAr };
}

/** Pick explicit bilingual label for UI (not the API `name` fallback alone). */
export function pickLocalizedRefName(item: LocalizedRefName, locale: AppLocale): string {
  if (locale === 'ar') return item.nameAr || item.nameEn || item.name;
  return item.nameEn || item.nameAr || item.name;
}
