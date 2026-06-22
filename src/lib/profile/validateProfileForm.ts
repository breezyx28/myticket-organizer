import type { OrganizerUser } from '@/types/domain';

export type ProfileValidationErrors = Record<string, string>;

type TranslateFn = (key: string) => string;

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateOptionalUrl(value: string | undefined, fieldKey: string, t: TranslateFn): string | undefined {
  const v = (value ?? '').trim();
  if (!v) return undefined;
  if (!isValidHttpUrl(v)) return t(`validation.${fieldKey}Invalid`);
  return undefined;
}

export function validateProfileBeforeSave(profile: OrganizerUser, t: TranslateFn): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};

  const displayName = profile.displayName.trim();
  if (displayName.length < 2) errors.displayName = t('validation.displayNameMin');

  const bio = profile.bio.trim();
  if (bio.length < 30) errors.bio = t('validation.bioMin');

  const phoneDigits = profile.phone.replace(/[^\d]/g, '');
  if (phoneDigits.length < 8) errors.phone = t('validation.phoneMin');

  if (!profile.regionId?.trim()) errors.regionId = t('validation.regionRequired');
  if (!profile.cityId?.trim()) errors.cityId = t('validation.cityRequired');

  const websiteErr = validateOptionalUrl(profile.organization?.website, 'website', t);
  if (websiteErr) errors.website = websiteErr;

  const instagramErr = validateOptionalUrl(profile.organization?.instagram, 'instagram', t);
  if (instagramErr) errors.instagram = instagramErr;

  const twitterErr = validateOptionalUrl(profile.organization?.twitter, 'twitter', t);
  if (twitterErr) errors.twitter = twitterErr;

  const tiktokErr = validateOptionalUrl(profile.organization?.tiktok, 'tiktok', t);
  if (tiktokErr) errors.tiktok = tiktokErr;

  const duration = profile.organization?.typicalEventDurationHours;
  if (duration != null && (Number.isNaN(duration) || duration < 0)) {
    errors.typicalEventDurationHours = t('validation.durationMin');
  }

  const venue = profile.venue;
  if (venue?.name?.trim()) {
    if (!venue.regionId?.trim()) errors.venueRegionId = t('validation.venueRegionRequired');
    if (!venue.cityId?.trim()) errors.venueCityId = t('validation.venueCityRequired');
    if ((venue.capacity ?? 0) <= 0) errors.venueCapacity = t('validation.venueCapacityMin');
  }

  return errors;
}
