import type { OrganizerUser } from '@/types/domain';
import { readApiNumericId, readNum, readString, toIdString, unwrapEnvelope } from '@/lib/api/json';

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

/** Map GET /me/venues row to OrganizerUser.venue shape (best-effort). */
export function mapApiVenueRowToVenue(row: unknown): OrganizerUser['venue'] | undefined {
  const o = asRecord(unwrapEnvelope(row)) ?? asRecord(row) ?? {};
  const name = readString(o, 'name');
  if (!name) return undefined;
  const facilitiesRaw = o.facilities ?? o.facility_list;
  const facilities: string[] = Array.isArray(facilitiesRaw)
    ? facilitiesRaw.map((x) => (typeof x === 'string' ? x : String(x)))
    : [];
  const regionIdRaw = o.region_id ?? o.regionId;
  const cityIdRaw = o.city_id ?? o.cityId;
  const regionId = (() => {
    const a = readApiNumericId(o, 'region_id', 'regionId');
    if (a) return a;
    if (typeof regionIdRaw === 'number' && Number.isFinite(regionIdRaw)) return String(Math.trunc(regionIdRaw));
    if (typeof regionIdRaw === 'string' && /^\d+$/.test(regionIdRaw.trim())) return regionIdRaw.trim();
    return '';
  })();
  const cityId = (() => {
    const a = readApiNumericId(o, 'city_id', 'cityId');
    if (a) return a;
    if (typeof cityIdRaw === 'number' && Number.isFinite(cityIdRaw)) return String(Math.trunc(cityIdRaw));
    if (typeof cityIdRaw === 'string' && /^\d+$/.test(cityIdRaw.trim())) return cityIdRaw.trim();
    return '';
  })();
  return {
    name,
    address: readString(o, 'address', 'address_line', 'addressLine'),
    city: readString(o, 'city'),
    capacity: readNum(o, 'capacity'),
    facilities,
    regionId: regionId.trim() || undefined,
    cityId: cityId.trim() || undefined,
    latitude: readNum(o, 'latitude', 'lat'),
    longitude: readNum(o, 'longitude', 'lng', 'lon'),
  };
}

/** First venue row id + mapped venue (for PATCH /me/venues/{id}). */
export function mapApiVenueRowMeta(row: unknown): { id: string; venue: NonNullable<OrganizerUser['venue']> } | undefined {
  const o = asRecord(unwrapEnvelope(row)) ?? asRecord(row) ?? {};
  const id = toIdString(o.id);
  const venue = mapApiVenueRowToVenue(row);
  if (!id || !venue) return undefined;
  return { id, venue };
}

function regionOrCityIdForApi(v: string | undefined): number | undefined {
  const t = (v ?? '').trim();
  if (!t) return undefined;
  if (/^\d+$/.test(t)) return Number(t);
  return undefined;
}

export function venueToApiBody(venue: NonNullable<OrganizerUser['venue']>): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: venue.name,
    address_line: venue.address?.trim() ? venue.address.trim() : null,
    capacity: venue.capacity,
    facilities: venue.facilities,
  };
  if (venue.city !== undefined) {
    body.city = venue.city?.trim() ? venue.city.trim() : null;
  }
  const rid = regionOrCityIdForApi(venue.regionId);
  const cid = regionOrCityIdForApi(venue.cityId);
  if (rid !== undefined) body.region_id = rid;
  if (cid !== undefined) body.city_id = cid;
  if (venue.latitude !== undefined && venue.latitude !== null) body.latitude = venue.latitude;
  if (venue.longitude !== undefined && venue.longitude !== null) body.longitude = venue.longitude;
  return body;
}

export type SocialLinkIds = Partial<Record<'website' | 'instagram' | 'twitter' | 'tiktok', string>>;

export type PreviousEventRow = { id: string; title: string };

/** Parse profile JSON for social link ids and previous-event rows (ids when API returns objects). */
export function extractProfileResourceMeta(raw: unknown): {
  socialLinkIds: SocialLinkIds;
  previousEventRows: PreviousEventRow[];
} {
  const root = asRecord(unwrapEnvelope(raw)) ?? asRecord(raw) ?? {};
  const socialLinkIds: SocialLinkIds = {};
  const linksRaw = root.social_links ?? root.socialLinks;
  if (Array.isArray(linksRaw)) {
    for (const row of linksRaw) {
      const o = asRecord(row);
      if (!o) continue;
      const platRaw = readString(o, 'platform', 'type', 'provider').toLowerCase();
      const plat = platRaw === 'x' ? 'twitter' : platRaw;
      const id = toIdString(o.id);
      if (!id) continue;
      if (plat === 'website' || plat === 'instagram' || plat === 'twitter' || plat === 'tiktok') {
        socialLinkIds[plat] = id;
      }
    }
  }

  const org = asRecord(root.organization ?? root.org);
  const prevRaw = root.previous_events ?? root.previousEvents ?? org?.previous_events;
  const previousEventRows: PreviousEventRow[] = [];
  if (Array.isArray(prevRaw)) {
    for (const row of prevRaw) {
      if (typeof row === 'string') {
        if (row.trim()) previousEventRows.push({ id: '', title: row.trim() });
      } else {
        const o = asRecord(row);
        if (!o) continue;
        const title = readString(o, 'title', 'name');
        if (!title) continue;
        previousEventRows.push({ id: toIdString(o.id), title });
      }
    }
  }

  return { socialLinkIds, previousEventRows };
}

export function readSocialUrlsFromUser(p: OrganizerUser): Record<keyof SocialLinkIds, string> {
  const o = p.organization;
  return {
    website: (o?.website ?? '').trim(),
    instagram: (o?.instagram ?? '').trim(),
    twitter: (o?.twitter ?? '').trim(),
    tiktok: (o?.tiktok ?? '').trim(),
  };
}
