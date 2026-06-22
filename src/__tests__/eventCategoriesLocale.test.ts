import { describe, expect, it } from 'vitest';
import { pickLocalizedRefName } from '@/lib/locale/localizedRefName';
import { normalizeLocalizedRefName } from '@/lib/locale/localizedRefName';

describe('event category localized names', () => {
  it('uses name_ar in Arabic UI', () => {
    const row = normalizeLocalizedRefName({ name: 'Music', name_en: 'Music', name_ar: 'موسيقى' });
    expect(pickLocalizedRefName(row, 'ar')).toBe('موسيقى');
    expect(pickLocalizedRefName(row, 'en')).toBe('Music');
  });
});
