import { Button } from '@/components/ui/Button';
import type { TalentListing, VendorListing } from '@/types/domain';
import { MapPin, Star } from 'lucide-react';

type Listing = TalentListing | VendorListing;

export function MarketplaceSuggestionCard({
  listing,
  kind,
  onRequest,
  onViewDetails,
}: {
  listing: Listing;
  kind: 'talent' | 'vendor';
  onRequest: () => void;
  onViewDetails: () => void;
}) {
  const subtitle =
    kind === 'talent'
      ? (listing as TalentListing).categoryLabel ?? listing.headline
      : (listing as VendorListing).serviceLabel ?? listing.headline;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink-10 bg-white shadow-card-sm">
      <div className="relative aspect-[16/10] bg-ink-5">
        {listing.coverImageUrl ? (
          <img src={listing.coverImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] font-semibold uppercase tracking-wide text-ink-40">
            {kind === 'talent' ? 'Talent' : 'Vendor'}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="truncate text-[15px] font-extrabold text-ink">{listing.displayName}</p>
        {subtitle ? <p className="mt-0.5 truncate text-[12px] text-ink-60">{subtitle}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-50">
          {listing.city ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" strokeWidth={2} aria-hidden />
              {listing.city}
            </span>
          ) : null}
          {listing.ratingSummary ? (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 text-lemon" strokeWidth={2} aria-hidden />
              {listing.ratingSummary}
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant="dark"
            size="sm"
            className="w-full active:scale-[0.98]"
            onClick={onRequest}
          >
            Request
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full active:scale-[0.98]"
            onClick={onViewDetails}
          >
            View details
          </Button>
        </div>
      </div>
    </article>
  );
}
