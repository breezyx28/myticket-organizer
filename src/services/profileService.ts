import { tError } from '@/lib/i18n/translateError';
import type { OrganizerUser } from '@/types/domain';
import {
  extractProfileResourceMeta,
  mapApiVenueRowMeta,
  mapApiVenueRowToVenue,
  readSocialUrlsFromUser,
  venueToApiBody,
  type SocialLinkIds,
} from '@/lib/api/mapMeResources';
import { parseCreatedSocialLinkId } from '@/lib/api/parseProfileUpload';
import { organizerUserToProfilePatch, mapApiProfileToOrganizerUser } from '@/lib/api/mapProfile';
import {
  cacheProfileImageUrl,
  clearCachedProfileImageUrl,
  readCachedProfileImageUrl,
} from '@/lib/profile/profileImageCache';
import { organizerApi } from '@/store/api/organizerApi';
import { apiDispatch, apiUnwrap } from '@/services/apiDispatch';

const SOCIAL_PLATFORMS = ['website', 'instagram', 'twitter', 'tiktok'] as const satisfies readonly (keyof SocialLinkIds)[];

const PROFILE_LOGO_MAX_BYTES = 4 * 1024 * 1024;
const PROFILE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const PROFILE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const PROFILE_DOC_MAX_BYTES = 12 * 1024 * 1024;
const PROFILE_GALLERY_IMAGE_MAX_BYTES = 6 * 1024 * 1024;

/** POST /me/profile/logo (multipart `logo`); returns absolute `logo_url` from updated profile. */
export async function uploadProfileLogo(file: File): Promise<string> {
  if (file.size > PROFILE_LOGO_MAX_BYTES) {
    throw new Error(tError('profile.logoTooLarge'));
  }
  const formData = new FormData();
  formData.append('logo', file);
  const user = await apiUnwrap<OrganizerUser>(apiDispatch(organizerApi.endpoints.postProfileLogo.initiate(formData)));
  const url = (user.logoUrl || '').trim();
  if (!url) throw new Error(tError('api.uploadNoUrl'));
  return url;
}

/** POST /me/profile-image (multipart `image`); returns absolute profile image URL. */
export async function uploadProfileImage(file: File, userId?: string): Promise<string> {
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new Error(tError('profile.imageTooLarge'));
  }
  if (file.type && !PROFILE_IMAGE_TYPES.has(file.type)) {
    throw new Error(tError('profile.imageType'));
  }
  const formData = new FormData();
  formData.append('image', file);
  const url = await apiUnwrap<string>(apiDispatch(organizerApi.endpoints.postProfileImage.initiate(formData)));
  if (userId?.trim()) cacheProfileImageUrl(userId.trim(), url);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('organizer-dashboard-changed'));
  }
  return url;
}

/** Clears profile photo via PATCH /me/profile (`avatar_url: null`). */
export async function clearProfileImage(userId?: string): Promise<void> {
  await apiUnwrap(apiDispatch(organizerApi.endpoints.patchProfile.initiate({ profileImageUrl: '' })));
  if (userId?.trim()) clearCachedProfileImageUrl(userId.trim());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('organizer-dashboard-changed'));
  }
}

/** POST /me/profile/document (multipart `document`); returns public document URL. */
export async function uploadProfileDocument(file: File): Promise<string> {
  if (file.size > PROFILE_DOC_MAX_BYTES) {
    throw new Error(tError('profile.documentTooLarge'));
  }
  const formData = new FormData();
  formData.append('document', file);
  return apiUnwrap<string>(apiDispatch(organizerApi.endpoints.postProfileDocument.initiate(formData)));
}

/** POST /me/profile/gallery (multipart `image`); returns public image URL for one item. */
export async function uploadProfileGalleryImage(file: File): Promise<string> {
  if (file.size > PROFILE_GALLERY_IMAGE_MAX_BYTES) {
    throw new Error(tError('profile.galleryTooLarge'));
  }
  const formData = new FormData();
  formData.append('image', file);
  return apiUnwrap<string>(apiDispatch(organizerApi.endpoints.postProfileGallery.initiate(formData)));
}

export type ProfileResourceContext = {
  venueId: string | null;
  socialLinkIds: SocialLinkIds;
  initialSocialUrls: Record<keyof SocialLinkIds, string>;
  previousEvents: { id: string | null; title: string }[];
};

export type ProfileLoadBundle = {
  user: OrganizerUser;
  resourceCtx: ProfileResourceContext;
};

async function mergePrimaryVenueFromList(profile: OrganizerUser): Promise<OrganizerUser> {
  try {
    const rows = await apiUnwrap<unknown[]>(apiDispatch(organizerApi.endpoints.listVenues.initiate()));
    const venues = Array.isArray(rows) ? rows : [];
    const first = venues[0];
    if (!first) return profile;
    const mapped = mapApiVenueRowToVenue(first);
    if (mapped) return { ...profile, venue: mapped };
    return profile;
  } catch {
    return profile;
  }
}

/** GET /me/profile JSON (for social-link and previous-event ids not kept on OrganizerUser). */
export async function fetchMeProfileRaw(): Promise<unknown> {
  return apiUnwrap<unknown>(apiDispatch(organizerApi.endpoints.getProfileRaw.initiate()));
}

function zipPreviousEventsWithIds(titles: string[], rows: { id: string; title: string }[]): { id: string | null; title: string }[] {
  return titles.map((title) => {
    const row = rows.find((r) => r.title.toLowerCase() === title.toLowerCase());
    return { id: row?.id?.trim() ? row.id : null, title };
  });
}

function applyProfileImageFallback(user: OrganizerUser, prior?: OrganizerUser): OrganizerUser {
  if (user.profileImageUrl?.trim()) return user;
  const priorUrl = prior?.profileImageUrl?.trim();
  if (priorUrl && /^https?:\/\//i.test(priorUrl)) {
    return { ...user, profileImageUrl: priorUrl };
  }
  const cached = readCachedProfileImageUrl(user.id);
  if (cached) return { ...user, profileImageUrl: cached };
  return user;
}

export async function loadProfileBundle(): Promise<ProfileLoadBundle> {
  const [raw, venuesRows] = await Promise.all([
    fetchMeProfileRaw(),
    apiUnwrap<unknown[]>(apiDispatch(organizerApi.endpoints.listVenues.initiate())).catch(() => []),
  ]);

  const profile = mapApiProfileToOrganizerUser(raw);
  const metaFromRaw = extractProfileResourceMeta(raw);

  const venues = Array.isArray(venuesRows) ? venuesRows : [];
  const firstMeta = venues[0] ? mapApiVenueRowMeta(venues[0]) : undefined;
  const user: OrganizerUser = applyProfileImageFallback(
    firstMeta?.venue != null ? { ...profile, venue: firstMeta.venue } : { ...profile }
  );

  const titles = user.organization?.previousEvents ?? [];
  const previousEvents = zipPreviousEventsWithIds(titles, metaFromRaw.previousEventRows);

  const resourceCtx: ProfileResourceContext = {
    venueId: firstMeta?.id ?? null,
    socialLinkIds: metaFromRaw.socialLinkIds,
    initialSocialUrls: readSocialUrlsFromUser(user),
    previousEvents,
  };

  return { user, resourceCtx };
}

export async function getProfile(): Promise<OrganizerUser> {
  const profile = await apiUnwrap<OrganizerUser>(apiDispatch(organizerApi.endpoints.getProfile.initiate()));
  return mergePrimaryVenueFromList(profile);
}

/** Persists profile via PATCH /me/profile and venue / social-links via split endpoints. */
export async function saveOrganizerProfile(p: OrganizerUser, ctx: ProfileResourceContext): Promise<ProfileLoadBundle> {
  const regionIdForPatch = p.regionId?.trim() || undefined;

  const profilePatchPayload: Partial<OrganizerUser> = {
    displayName: p.displayName,
    bio: p.bio,
    phone: p.phone,
    logoUrl: p.logoUrl,
    regionId: regionIdForPatch,
    organizationDocument: p.organizationDocument,
    gallery: p.gallery,
  };

  if (p.cityId !== undefined) {
    profilePatchPayload.cityId = p.cityId;
  }

  const profilePatch = organizerUserToProfilePatch(profilePatchPayload);
  if (Object.keys(profilePatch).length > 0) {
    await apiUnwrap(apiDispatch(organizerApi.endpoints.patchProfile.initiate(profilePatchPayload)));
  }

  const v = p.venue;
  if (v?.name?.trim()) {
    const body = venueToApiBody(v);
    if (ctx.venueId) {
      await apiUnwrap(apiDispatch(organizerApi.endpoints.patchVenue.initiate({ id: ctx.venueId, body })));
    } else {
      await apiUnwrap(apiDispatch(organizerApi.endpoints.createVenue.initiate(body)));
    }
  }

  const createdSocialIds: Partial<Record<keyof SocialLinkIds, string>> = {};

  for (const plat of SOCIAL_PLATFORMS) {
    const cur = readSocialUrlsFromUser(p)[plat].trim();
    const init = (ctx.initialSocialUrls[plat] ?? '').trim();
    if (cur === init) continue;
    const oldId = ctx.socialLinkIds[plat];
    if (!cur) {
      if (oldId) await apiUnwrap(apiDispatch(organizerApi.endpoints.deleteSocialLink.initiate(oldId)));
      continue;
    }
    // Backend upserts by (profile, platform): POST updates URL (200) or creates (201) — no DELETE needed.
    const createdRaw = await apiUnwrap<unknown>(
      apiDispatch(organizerApi.endpoints.createSocialLink.initiate({ platform: plat, url: cur }))
    );
    const newId = parseCreatedSocialLinkId(createdRaw);
    if (newId) createdSocialIds[plat] = newId;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('organizer-dashboard-changed'));
  }

  const bundle = await loadProfileBundle();
  const mergedIds: SocialLinkIds = { ...bundle.resourceCtx.socialLinkIds };
  for (const plat of SOCIAL_PLATFORMS) {
    const id = createdSocialIds[plat];
    if (id) mergedIds[plat] = id;
  }

  return {
    ...bundle,
    user: applyProfileImageFallback(bundle.user, p),
    resourceCtx: { ...bundle.resourceCtx, socialLinkIds: mergedIds },
  };
}

/** @deprecated Prefer saveOrganizerProfile for full persistence. */
export async function updateProfile(patch: Partial<OrganizerUser>) {
  const body = organizerUserToProfilePatch(patch);
  if (Object.keys(body).length > 0) {
    await apiUnwrap(apiDispatch(organizerApi.endpoints.patchProfile.initiate(patch)));
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('organizer-dashboard-changed'));
  }
}

function isPersistedMediaUrl(s: string): boolean {
  const t = s.trim();
  return /^https?:\/\//i.test(t) || (t.startsWith('/') && t.length >= 4);
}

export function isProfileComplete(p: OrganizerUser): boolean {
  return (
    p.displayName.trim().length >= 2 &&
    p.bio.trim().length >= 30 &&
    p.phone.trim().length >= 8 &&
    (Boolean((p.cityId ?? '').trim()) || p.city.trim().length >= 2) &&
    !!p.organizationDocument &&
    isPersistedMediaUrl((p.organizationDocument || '').trim()) &&
    (p.gallery?.length ?? 0) >= 1 &&
    (p.gallery ?? []).some((x) => isPersistedMediaUrl(String(x).trim())) &&
    !!p.venue &&
    (p.venue?.capacity ?? 0) > 0 &&
    (p.venue?.facilities?.length ?? 0) >= 1 &&
    !!p.organization
  );
}
