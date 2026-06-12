import type { MarketplaceCategoryOption, TalentListing, VendorListing } from '@/types/domain';
import { readBool, readNum, readString, toIdString, unwrapEnvelope } from '@/lib/api/json';

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function mapProfileCategories(
  raw: unknown,
  idKey: 'talent_category_id' | 'service_category_id'
): MarketplaceCategoryOption[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: MarketplaceCategoryOption[] = [];
  for (const item of raw) {
    const o = asRecord(item);
    if (!o) continue;
    const id = toIdString(o[idKey]);
    const name = readString(o, 'name_en', 'name', 'name_ar');
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name, slug: readString(o, 'slug') || undefined });
  }
  return out;
}

function resolveImageUrl(root: Record<string, unknown>): string {
  const direct = readString(
    root,
    'profile_image_url',
    'profile_image',
    'cover_image_url',
    'coverImageUrl',
    'image_url',
    'avatar_url',
    'photo_url'
  );
  if (direct) return direct;
  const gallery = root.gallery;
  if (Array.isArray(gallery) && gallery.length > 0) {
    const first = asRecord(gallery[0]);
    if (first) return readString(first, 'image_url', 'url');
  }
  const media = asRecord(root.media) ?? asRecord(root.cover);
  if (media) return readString(media, 'url', 'image_url');
  return '';
}

function resolveProfileId(root: Record<string, unknown>): string {
  return (
    toIdString(root.id ?? root.profile_id ?? root.talent_profile_id ?? root.vendor_profile_id) ||
    toIdString(root.talent_id ?? root.vendor_id)
  );
}

function isApprovedProfile(root: Record<string, unknown>): boolean {
  const active = readBool(root, 'is_active');
  if (active === false) return false;
  const deleted = readString(root, 'deleted_at');
  if (deleted) return false;
  return true;
}

function joinCategoryLabels(categories: MarketplaceCategoryOption[]): string {
  return categories
    .slice(0, 2)
    .map((c) => c.name)
    .join(' · ');
}

export function mapApiTalentListing(raw: unknown): TalentListing | null {
  const root = asRecord(raw);
  if (!root || !isApprovedProfile(root)) return null;
  const profileId = resolveProfileId(root);
  const slug = readString(root, 'slug', 'handle');
  const displayName = readString(root, 'stage_name', 'display_name', 'displayName', 'name', 'full_name');
  if (!profileId && !slug) return null;
  const categories = mapProfileCategories(root.categories, 'talent_category_id');
  const cat = asRecord(root.category);
  const rating = readNum(root, 'rating_average', 'rating_avg', 'average_rating', 'rating');
  const categoryLabel = joinCategoryLabels(categories) || readString(cat ?? {}, 'name', 'title') || undefined;
  return {
    profileId: profileId || slug,
    slug: slug || profileId,
    displayName: displayName || 'Talent',
    headline: readString(root, 'headline', 'tagline', 'title', 'specialty', 'bio') || categoryLabel || '',
    city: readString(root, 'city', 'city_name') || '',
    coverImageUrl: resolveImageUrl(root),
    categoryLabel,
    ratingSummary: rating != null ? String(rating) : undefined,
    regionId: toIdString(root.region_id ?? root.regionId) || undefined,
    cityId: toIdString(root.city_id ?? root.cityId) || undefined,
    categories,
  };
}

export function mapApiVendorListing(raw: unknown): VendorListing | null {
  const root = asRecord(raw);
  if (!root || !isApprovedProfile(root)) return null;
  const profileId = resolveProfileId(root);
  const slug = readString(root, 'slug', 'handle');
  const displayName = readString(root, 'business_name', 'display_name', 'displayName', 'name');
  if (!profileId && !slug) return null;
  const categories = mapProfileCategories(root.categories, 'service_category_id');
  const svc = asRecord(root.service) ?? asRecord(root.category);
  const rating = readNum(root, 'rating_average', 'rating_avg', 'average_rating', 'rating');
  const serviceLabel = joinCategoryLabels(categories) || readString(svc ?? {}, 'name', 'title') || undefined;
  return {
    profileId: profileId || slug,
    slug: slug || profileId,
    displayName: displayName || 'Vendor',
    headline:
      readString(root, 'coverage_area', 'headline', 'tagline', 'service_type', 'bio') || serviceLabel || '',
    city: readString(root, 'city', 'city_name') || '',
    coverImageUrl: resolveImageUrl(root),
    serviceLabel,
    ratingSummary: rating != null ? String(rating) : undefined,
    regionId: toIdString(root.region_id ?? root.regionId) || undefined,
    cityId: toIdString(root.city_id ?? root.cityId) || undefined,
    categories,
  };
}

export function mapApiTalentsList(raw: unknown): TalentListing[] {
  const inner = unwrapEnvelope(raw);
  const rows = Array.isArray(inner)
    ? inner
    : inner && typeof inner === 'object' && Array.isArray((inner as Record<string, unknown>).data)
      ? ((inner as Record<string, unknown>).data as unknown[])
      : [];
  return rows.map(mapApiTalentListing).filter((x): x is TalentListing => x != null);
}

export function mapApiVendorsList(raw: unknown): VendorListing[] {
  const inner = unwrapEnvelope(raw);
  const rows = Array.isArray(inner)
    ? inner
    : inner && typeof inner === 'object' && Array.isArray((inner as Record<string, unknown>).data)
      ? ((inner as Record<string, unknown>).data as unknown[])
      : [];
  return rows.map(mapApiVendorListing).filter((x): x is VendorListing => x != null);
}

export function mapApiTalentDetail(raw: unknown): TalentListing | null {
  return mapApiTalentListing(unwrapEnvelope(raw) ?? raw);
}

export function mapApiVendorDetail(raw: unknown): VendorListing | null {
  return mapApiVendorListing(unwrapEnvelope(raw) ?? raw);
}

export function mergeCategoryOptions(rows: MarketplaceCategoryOption[][]): MarketplaceCategoryOption[] {
  const byId = new Map<string, MarketplaceCategoryOption>();
  for (const group of rows) {
    for (const c of group) {
      if (!byId.has(c.id)) byId.set(c.id, c);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
