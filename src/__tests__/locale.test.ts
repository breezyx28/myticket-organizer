import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readStoredLocale, LOCALE_STORAGE_KEY } from '@/config/locale';
import localeReducer, { hydrateLanguage, setLanguage } from '@/store/slices/localeSlice';
import { appendAcceptLanguage, getApiLanguage, setApiLanguage } from '@/lib/locale/apiHeaders';
import { applyDocumentLocale } from '@/lib/locale/document';
import { formatDate, formatDateTime, formatNumber, formatRelative } from '@/lib/locale/format';
import { normalizeLocalizedRefName, pickLocalizedRefName } from '@/lib/locale/localizedRefName';
import type { RootState } from '@/store/store';

describe('locale slice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to stored locale or en', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'ar');
    expect(readStoredLocale()).toBe('ar');
  });

  it('setLanguage updates state and persists to localStorage', () => {
    const next = localeReducer({ language: 'en' }, setLanguage('ar'));
    expect(next.language).toBe('ar');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('ar');
  });

  it('hydrateLanguage updates state without writing storage', () => {
    const next = localeReducer({ language: 'en' }, hydrateLanguage('ar'));
    expect(next.language).toBe('ar');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });
});

describe('appendAcceptLanguage', () => {
  afterEach(() => {
    setApiLanguage('en');
  });

  it('uses Redux locale when getState is provided', () => {
    const headers = new Headers();
    const getState = () =>
      ({
        locale: { language: 'ar' },
      }) as RootState;
    appendAcceptLanguage(headers, getState);
    expect(headers.get('Accept-Language')).toBe('ar');
  });

  it('falls back to module api language when getState is omitted', () => {
    setApiLanguage('ar');
    const headers = new Headers();
    appendAcceptLanguage(headers);
    expect(headers.get('Accept-Language')).toBe('ar');
  });

  it('prefers getState locale over module fallback', () => {
    setApiLanguage('en');
    const headers = new Headers();
    appendAcceptLanguage(headers, () => ({ locale: { language: 'ar' } }) as RootState);
    expect(headers.get('Accept-Language')).toBe('ar');
    expect(getApiLanguage()).toBe('en');
  });
});

describe('applyDocumentLocale', () => {
  afterEach(() => {
    document.documentElement.lang = '';
    document.documentElement.dir = '';
    document.body.classList.remove('rtl');
  });

  it('sets ltr document attributes for English', () => {
    applyDocumentLocale('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.body.classList.contains('rtl')).toBe(false);
  });

  it('sets rtl document attributes for Arabic', () => {
    applyDocumentLocale('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.body.classList.contains('rtl')).toBe(true);
  });
});

describe('format helpers', () => {
  it('formats numbers with Arabic locale digits grouping', () => {
    const ar = formatNumber(12345.6, 'ar');
    expect(ar).toMatch(/١٢|12/);
  });

  it('formats dates with locale', () => {
    const en = formatDate('2026-05-20T12:00:00.000Z', 'en');
    const ar = formatDate('2026-05-20T12:00:00.000Z', 'ar');
    expect(en.length).toBeGreaterThan(4);
    expect(ar.length).toBeGreaterThan(4);
    expect(formatDateTime('2026-05-20T12:00:00.000Z', 'en')).toContain('2026');
  });

  it('formats relative time via translator', () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString();
    const t = (key: string, opts?: { count?: number }) => {
      if (key === 'time.minutesAgo') return `${opts?.count}m ago`;
      return key;
    };
    expect(formatRelative(recent, 'en', t)).toBe('5m ago');
  });
});

describe('localized reference names', () => {
  it('normalizes bilingual fields with fallbacks', () => {
    expect(normalizeLocalizedRefName({ name: 'Riyadh', name_en: 'Riyadh', name_ar: 'الرياض' })).toEqual({
      name: 'Riyadh',
      nameEn: 'Riyadh',
      nameAr: 'الرياض',
    });
    expect(normalizeLocalizedRefName({ name: 'Riyadh' })).toEqual({
      name: 'Riyadh',
      nameEn: 'Riyadh',
      nameAr: 'Riyadh',
    });
  });

  it('picks name_en or name_ar by locale', () => {
    const row = normalizeLocalizedRefName({ name: 'Riyadh', name_en: 'Riyadh', name_ar: 'الرياض' });
    expect(pickLocalizedRefName(row, 'en')).toBe('Riyadh');
    expect(pickLocalizedRefName(row, 'ar')).toBe('الرياض');
  });
});
