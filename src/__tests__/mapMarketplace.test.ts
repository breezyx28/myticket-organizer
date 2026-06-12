import { describe, expect, it } from 'vitest';
import {
  mapApiTalentListing,
  mapApiTalentsList,
  mapApiVendorListing,
  mergeCategoryOptions,
} from '@/lib/api/mapMarketplace';

describe('mapMarketplace', () => {
  it('maps live API talent row shape', () => {
    const row = mapApiTalentListing({
      id: 3,
      slug: 'kat-25',
      stage_name: 'KAT',
      bio: 'Performer bio',
      region_id: 5,
      city_id: 36,
      profile_image_url: 'https://cdn.example.com/kat.png',
      rating_average: '4.85',
      is_active: 1,
      categories: [
        { talent_category_id: 2, slug: 'musician', name_en: 'Musician' },
        { talent_category_id: 4, slug: 'dj', name_en: 'DJ' },
      ],
    });
    expect(row?.profileId).toBe('3');
    expect(row?.displayName).toBe('KAT');
    expect(row?.coverImageUrl).toBe('https://cdn.example.com/kat.png');
    expect(row?.categoryLabel).toBe('Musician · DJ');
    expect(row?.ratingSummary).toBe('4.85');
    expect(row?.regionId).toBe('5');
    expect(row?.cityId).toBe('36');
    expect(row?.categories).toHaveLength(2);
  });

  it('maps talents list envelope', () => {
    const rows = mapApiTalentsList({
      data: [
        { id: 1, slug: 'a', stage_name: 'A', is_active: 1 },
        { id: 2, slug: 'b', stage_name: 'B', is_active: 1 },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.slug).toBe('a');
  });

  it('maps vendor listing with service categories', () => {
    const row = mapApiVendorListing({
      id: 1,
      slug: 'demo-premium-vendor',
      business_name: 'ALI Mahmoud for Sound Systems',
      coverage_area: 'Riyadh & Eastern Province',
      profile_image_url: 'https://cdn.example.com/vendor.png',
      rating_average: '4.60',
      is_active: 1,
      categories: [
        { service_category_id: 4, slug: 'sound', name_en: 'Sound Systems' },
      ],
    });
    expect(row?.profileId).toBe('1');
    expect(row?.displayName).toBe('ALI Mahmoud for Sound Systems');
    expect(row?.serviceLabel).toBe('Sound Systems');
    expect(row?.headline).toContain('Riyadh');
  });

  it('merges unique category options', () => {
    const merged = mergeCategoryOptions([
      [{ id: '2', name: 'Musician' }, { id: '4', name: 'DJ' }],
      [{ id: '2', name: 'Musician' }, { id: '1', name: 'Singer' }],
    ]);
    expect(merged).toHaveLength(3);
    expect(merged.map((c) => c.id).sort()).toEqual(['1', '2', '4']);
  });
});
