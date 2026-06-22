import { readString, toIdString, unwrapEnvelope } from '@/lib/api/json';

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function profileRecordFromEnvelope(raw: unknown): Record<string, unknown> | null {
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw);
  if (!root) return null;
  return asRecord(root.data) ?? root;
}

export function readProfileImageFromRecord(profile: Record<string, unknown>): string | undefined {
  const direct = readString(
    profile,
    'profile_image_url',
    'profileImageUrl',
    'avatar_url',
    'avatarUrl',
    'image_url',
    'imageUrl'
  ).trim();
  if (/^https?:\/\//i.test(direct) || (direct.startsWith('/') && direct.length >= 2)) return direct;

  const nestedUser = asRecord(profile.user);
  if (nestedUser) {
    const fromUser = readString(
      nestedUser,
      'profile_image_url',
      'profileImageUrl',
      'avatar_url',
      'avatarUrl',
      'image_url'
    ).trim();
    if (/^https?:\/\//i.test(fromUser) || (fromUser.startsWith('/') && fromUser.length >= 2)) return fromUser;
  }

  const imageObj = asRecord(profile.profile_image) ?? asRecord(profile.image);
  if (imageObj) {
    const fromImage = readString(imageObj, 'url', 'image_url', 'path').trim();
    if (/^https?:\/\//i.test(fromImage) || (fromImage.startsWith('/') && fromImage.length >= 2)) return fromImage;
  }

  return undefined;
}

/** Resolve absolute profile image URL from POST /me/profile-image (201) or GET/PATCH /me profile. */
export function parseProfileImageUrl(raw: unknown): string | undefined {
  const profile = profileRecordFromEnvelope(raw);
  if (!profile) return undefined;
  return readProfileImageFromRecord(profile);
}

/** Resolve absolute document URL from POST /me/profile/document (or full profile) responses. */
export function parseProfileDocumentUrl(raw: unknown): string | undefined {
  const profile = profileRecordFromEnvelope(raw);
  if (!profile) return undefined;
  const u = readString(profile, 'document_url', 'organization_document', 'organizationDocument').trim();
  if (/^https?:\/\//i.test(u) || (u.startsWith('/') && u.length >= 2)) return u;
  const nested = asRecord(profile.document) ?? asRecord(profile.file);
  if (nested) {
    const u2 = readString(nested, 'url', 'path').trim();
    if (/^https?:\/\//i.test(u2) || (u2.startsWith('/') && u2.length >= 2)) return u2;
  }
  return undefined;
}

/** Resolve absolute image URL from POST /me/profile/gallery (or full profile) responses. */
export function parseProfileGalleryImageUrl(raw: unknown): string | undefined {
  const profile = profileRecordFromEnvelope(raw);
  if (!profile) return undefined;
  const galleryRaw = profile.gallery ?? profile.gallery_urls;
  const urls: string[] = [];
  if (Array.isArray(galleryRaw)) {
    for (const x of galleryRaw) {
      if (typeof x === 'string' && (/^https?:\/\//i.test(x) || (x.startsWith('/') && x.length >= 2))) urls.push(x);
      else if (typeof x === 'object' && x && 'url' in x) {
        const u = String((x as { url: unknown }).url).trim();
        if (/^https?:\/\//i.test(u) || (u.startsWith('/') && u.length >= 2)) urls.push(u);
      }
    }
  }
  if (urls.length) return urls[urls.length - 1];
  const d = profile;
  const single = readString(d, 'url', 'image_url', 'gallery_url').trim();
  if (/^https?:\/\//i.test(single) || (single.startsWith('/') && single.length >= 2)) return single;
  return undefined;
}

export function parseCreatedSocialLinkId(raw: unknown): string | undefined {
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw);
  if (!root) return undefined;
  const d = asRecord(root.data) ?? root;
  const id = toIdString(d.id);
  return id.trim() || undefined;
}
