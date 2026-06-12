import { MarketplaceCarousel, MarketplaceCarouselItem, MarketplaceCarouselSkeleton } from '@/components/marketplace/MarketplaceCarousel';
import {
  EMPTY_MARKETPLACE_FILTERS,
  MarketplaceFilterBar,
  type MarketplaceFilterValues,
} from '@/components/marketplace/MarketplaceFilterBar';
import { MarketplaceSuggestionCard } from '@/components/marketplace/MarketplaceSuggestionCard';
import { mergeCategoryOptions } from '@/lib/api/mapMarketplace';
import {
  useListTalentsQuery,
  useListVendorsQuery,
  type TalentListParams,
  type VendorListParams,
} from '@/store/api/mainMarketplaceApi';
import { useListSaudiCitiesQuery, useListSaudiRegionsQuery } from '@/store/api/referenceApi';
import type { TalentListing, VendorListing } from '@/types/domain';
import { useMemo, useState } from 'react';

type Listing = TalentListing | VendorListing;

function resolveCityLabel(
  listing: Listing,
  cityNameById: Map<string, string>,
  regionNameById: Map<string, string>
): string {
  if (listing.city) return listing.city;
  if (listing.cityId && cityNameById.has(listing.cityId)) return cityNameById.get(listing.cityId)!;
  if (listing.regionId && regionNameById.has(listing.regionId)) return regionNameById.get(listing.regionId)!;
  return '';
}

function withCityLabel(
  listing: Listing,
  cityNameById: Map<string, string>,
  regionNameById: Map<string, string>
): Listing {
  const city = resolveCityLabel(listing, cityNameById, regionNameById);
  return city && city !== listing.city ? { ...listing, city } : listing;
}

export function MarketplaceBrowseSection({
  kind,
  title,
  description,
  categoryFieldLabel,
  onRequest,
  onViewDetails,
}: {
  kind: 'talent' | 'vendor';
  title: string;
  description: string;
  categoryFieldLabel: string;
  onRequest: (listing: Listing) => void;
  onViewDetails: (listing: Listing) => void;
}) {
  const [filters, setFilters] = useState<MarketplaceFilterValues>(EMPTY_MARKETPLACE_FILTERS);
  const { data: regions = [] } = useListSaudiRegionsQuery();
  const { data: cities = [] } = useListSaudiCitiesQuery(filters.regionId);

  const categorySeedQuery = useListTalentsQuery(
    { per_page: 50 },
    { skip: kind !== 'talent' }
  );
  const vendorCategorySeedQuery = useListVendorsQuery(
    { per_page: 50 },
    { skip: kind !== 'vendor' }
  );

  const queryParams = useMemo((): TalentListParams | VendorListParams => {
    const base: TalentListParams & VendorListParams = { per_page: 20, page: 1 };
    if (filters.search.trim()) base.search = filters.search.trim();
    if (filters.regionId) base.region_id = filters.regionId;
    if (filters.cityId) base.city_id = filters.cityId;
    if (kind === 'talent' && filters.categoryId) {
      return { ...base, talent_category_id: filters.categoryId };
    }
    if (kind === 'vendor' && filters.categoryId) {
      return { ...base, service_category_id: filters.categoryId };
    }
    return base;
  }, [filters, kind]);

  const talentsQuery = useListTalentsQuery(queryParams as TalentListParams, { skip: kind !== 'talent' });
  const vendorsQuery = useListVendorsQuery(queryParams as VendorListParams, { skip: kind !== 'vendor' });
  const activeQuery = kind === 'talent' ? talentsQuery : vendorsQuery;

  const categoryOptions = useMemo(() => {
    const seed = kind === 'talent' ? categorySeedQuery.data : vendorCategorySeedQuery.data;
    if (!seed?.length) return [];
    return mergeCategoryOptions(seed.map((row) => row.categories));
  }, [kind, categorySeedQuery.data, vendorCategorySeedQuery.data]);

  const cityNameById = useMemo(() => new Map(cities.map((c) => [c.id, c.name])), [cities]);
  const regionNameById = useMemo(() => new Map(regions.map((r) => [r.id, r.name])), [regions]);

  const listings = useMemo(() => {
    const rows = activeQuery.data ?? [];
    return rows.map((row) => withCityLabel(row, cityNameById, regionNameById));
  }, [activeQuery.data, cityNameById, regionNameById]);

  const isLoading = activeQuery.isLoading || activeQuery.isFetching;
  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    Boolean(filters.categoryId) ||
    Boolean(filters.regionId) ||
    Boolean(filters.cityId);

  return (
    <section className="space-y-5">
      <div className="max-w-2xl">
        <h2 className="text-xl font-extrabold tracking-tight text-ink md:text-2xl">{title}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-60">{description}</p>
      </div>

      <MarketplaceFilterBar
        categoryLabel={categoryFieldLabel}
        categories={categoryOptions}
        regions={regions}
        cities={cities}
        values={filters}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_MARKETPLACE_FILTERS)}
      />

      <div className="pt-1">
        {isLoading ? (
          <MarketplaceCarouselSkeleton />
        ) : listings.length > 0 ? (
          <MarketplaceCarousel>
            {listings.map((listing) => (
              <MarketplaceCarouselItem key={listing.profileId}>
                <MarketplaceSuggestionCard
                  listing={listing}
                  kind={kind}
                  onRequest={() => onRequest(listing)}
                  onViewDetails={() => onViewDetails(listing)}
                />
              </MarketplaceCarouselItem>
            ))}
          </MarketplaceCarousel>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-20 bg-ink-5/20 px-6 py-12 text-center">
            <p className="text-[15px] font-semibold text-ink">
              {hasActiveFilters ? 'No matches for these filters' : `No approved ${kind === 'talent' ? 'talents' : 'vendors'} yet`}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-50">
              {hasActiveFilters
                ? 'Try clearing filters or broadening your search.'
                : 'Approved profiles will appear here once they are published on the marketplace.'}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_MARKETPLACE_FILTERS)}
                className="mt-4 rounded-full border border-ink-10 bg-white px-4 py-2 text-[12px] font-semibold text-ink transition hover:bg-ink-5 active:scale-[0.98]"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
