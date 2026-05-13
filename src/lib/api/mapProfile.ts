import type { OrganizerUser } from '@/types/domain';
import { readApiNumericId, readNum, readString, toIdString, unwrapEnvelope } from '@/lib/api/json';

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

/** PATCH body: only integer ids (Laravel); omit invalid non-numeric strings. */
function patchIntIdOrNull(raw: string | undefined): number | null | undefined {
  const t = (raw ?? '').trim();
  if (!t) return null;
  if (!/^\d+$/.test(t)) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Maps GET /me/profile (unknown JSON) to OrganizerUser used by the dashboard. */
export function mapApiProfileToOrganizerUser(raw: unknown): OrganizerUser {
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw) ?? {};
  const venueObj = asRecord(root.venue ?? root.primary_venue);

  const org = asRecord(root.organization ?? root.org);

  const galleryRaw = root.gallery ?? root.gallery_urls;
  let gallery: string[] = [];
  if (Array.isArray(galleryRaw)) {
    gallery = galleryRaw
      .map((x) =>
        typeof x === 'string'
          ? x
          : typeof x === 'object' && x && 'url' in x
            ? String((x as { url: unknown }).url)
            : ''
      )
      .filter(Boolean);
  }

  const prev = root.previous_events ?? org?.previous_events;
  let previousEvents: string[] = [];
  if (Array.isArray(prev)) {
    previousEvents = prev
      .map((x) => (typeof x === 'string' ? x : readString(asRecord(x) ?? {}, 'title', 'name')))
      .filter(Boolean);
  }

  const categoriesRaw = root.categories ?? org?.categories;
  const categories: string[] = Array.isArray(categoriesRaw)
    ? categoriesRaw.map((x) => (typeof x === 'string' ? x : String(x)))
    : [];

  const socialFromLinks: { website?: string; instagram?: string; twitter?: string; tiktok?: string } = {};
  const linksRaw = root.social_links ?? root.socialLinks;
  if (Array.isArray(linksRaw)) {
    for (const row of linksRaw) {
      const link = asRecord(row);
      if (!link) continue;
      const plat = readString(link, 'platform', 'type', 'provider').toLowerCase();
      const url = readString(link, 'url', 'link_url', 'link', 'website_url');
      if (!url) continue;
      if (plat === 'website') socialFromLinks.website = url;
      else if (plat === 'instagram') socialFromLinks.instagram = url;
      else if (plat === 'twitter' || plat === 'x') socialFromLinks.twitter = url;
      else if (plat === 'tiktok') socialFromLinks.tiktok = url;
    }
  }

  const facilitiesRaw = venueObj?.facilities;
  const facilities: string[] = Array.isArray(facilitiesRaw)
    ? facilitiesRaw.map((x) => (typeof x === 'string' ? x : String(x)))
    : [];

  const cityIdRaw = root.city_id ?? root.cityId;
  const profileCityId = (() => {
    const a = readApiNumericId(root, 'city_id', 'cityId');
    if (a) return a;
    if (typeof cityIdRaw === 'number' && Number.isFinite(cityIdRaw)) return String(Math.trunc(cityIdRaw));
    if (typeof cityIdRaw === 'string' && /^\d+$/.test(cityIdRaw.trim())) return cityIdRaw.trim();
    return '';
  })();

  const cityStrFromApi = readString(root, 'city') || (venueObj ? readString(venueObj, 'city') : '') || '';

  const regionId = readApiNumericId(root, 'region_id', 'regionId');

  const cityId = profileCityId.trim();
  const city = cityStrFromApi || '';

  const venueCityIdRaw = venueObj ? (venueObj.city_id ?? venueObj.cityId) : undefined;
  const venueCityIdStr = venueObj
    ? (() => {
        const v = venueObj as Record<string, unknown>;
        const a = readApiNumericId(v, 'city_id', 'cityId');
        if (a) return a;
        if (typeof venueCityIdRaw === 'number' && Number.isFinite(venueCityIdRaw)) return String(Math.trunc(venueCityIdRaw));
        if (typeof venueCityIdRaw === 'string' && /^\d+$/.test(venueCityIdRaw.trim())) return venueCityIdRaw.trim();
        return '';
      })()
    : '';

  const vRec = venueObj as Record<string, unknown> | null;
  const venueRegionIdStr = vRec ? readApiNumericId(vRec, 'region_id', 'regionId') : '';

  return {
    id: toIdString(root.id ?? root.user_id ?? 'me'),
    email: readString(root, 'email'),
    name: readString(root, 'name', 'full_name', 'fullName'),
    role: 'organizer',
    displayName: readString(root, 'display_name', 'displayName', 'name'),
    bio: readString(root, 'bio', 'description') || '',
    phone: readString(root, 'contact_phone', 'contactPhone', 'phone') || '',
    city,
    cityId: cityId || undefined,
    regionId: regionId || undefined,
    logoUrl: readString(root, 'logo_url', 'logoUrl'),
    organizationDocument:
      readString(root, 'document_url', 'organization_document', 'organizationDocument') || undefined,
    gallery,
    venue: venueObj
      ? {
          name: readString(venueObj, 'name'),
          address: readString(venueObj, 'address', 'address_line', 'addressLine'),
          city: readString(venueObj, 'city'),
          capacity: readNum(venueObj, 'capacity'),
          facilities,
          regionId: venueRegionIdStr.trim() || undefined,
          cityId: venueCityIdStr.trim() || undefined,
        }
      : undefined,
    organization: org
      ? {
          website: (socialFromLinks.website ?? readString(org as Record<string, unknown>, 'website')) || undefined,
          instagram: (socialFromLinks.instagram ?? readString(org as Record<string, unknown>, 'instagram')) || undefined,
          twitter: (socialFromLinks.twitter ?? readString(org as Record<string, unknown>, 'twitter')) || undefined,
          tiktok: (socialFromLinks.tiktok ?? readString(org as Record<string, unknown>, 'tiktok')) || undefined,
          previousEvents,
          typicalEventDurationHours: readNum(
            org as Record<string, unknown>,
            'typical_event_duration_hours',
            'typicalEventDurationHours'
          ),
          categories,
        }
      : {
          website: socialFromLinks.website,
          instagram: socialFromLinks.instagram,
          twitter: socialFromLinks.twitter,
          tiktok: socialFromLinks.tiktok,
          previousEvents,
          categories,
        },
  };
}

export function organizerUserToProfilePatch(patch: Partial<OrganizerUser>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (patch.displayName !== undefined) body.display_name = patch.displayName;
  if (patch.bio !== undefined) body.bio = patch.bio || null;
  if (patch.phone !== undefined) body.contact_phone = patch.phone || null;
  if (patch.city !== undefined && patch.cityId === undefined) {
    body.city = patch.city || null;
  }

  if (patch.cityId !== undefined) {
    const v = patchIntIdOrNull(patch.cityId);
    if (v === null) body.city_id = null;
    else if (v !== undefined) body.city_id = v;
  }

  if (patch.logoUrl !== undefined) {
    const u = (patch.logoUrl || '').trim();
    if (!u) body.logo_url = null;
    else if (/^https?:\/\//i.test(u) || u.startsWith('data:')) {
      if (u.length <= 500) body.logo_url = u;
    }
  }

  if (patch.regionId !== undefined) {
    const raw = (patch.regionId || '').trim();
    if (!raw) {
      body.region = null;
      body.region_id = null;
    } else {
      const v = patchIntIdOrNull(patch.regionId);
      if (v === null) {
        body.region = null;
        body.region_id = null;
      } else if (v !== undefined) {
        body.region_id = v;
      }
    }
  }

  if (patch.organizationDocument !== undefined) {
    const u = (patch.organizationDocument || '').trim();
    if (!u) body.document_url = null;
    else if (/^https?:\/\//i.test(u) || u.startsWith('/')) {
      if (u.length <= 500) body.document_url = u;
    }
  }

  if (patch.gallery !== undefined) {
    const raw = patch.gallery ?? [];
    const urls = raw
      .map((x) => String(x).trim())
      .filter((x) => /^https?:\/\//i.test(x) || x.startsWith('/'))
      .slice(0, 50);
    if (raw.length === 0) body.gallery_urls = null;
    else if (urls.length > 0) body.gallery_urls = urls;
  }

  return body;
}
