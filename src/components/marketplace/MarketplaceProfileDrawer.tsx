import { Button } from '@/components/ui/Button';
import { useGetTalentQuery, useGetVendorQuery } from '@/store/api/mainMarketplaceApi';
import { MapPin, Star, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function MarketplaceProfileDrawer({
  open,
  kind,
  slug,
  onClose,
  onRequest,
}: {
  open: boolean;
  kind: 'talent' | 'vendor';
  slug: string;
  onClose: () => void;
  onRequest: () => void;
}) {
  const { t } = useTranslation(['marketplace', 'common']);
  const talent = useGetTalentQuery(slug, { skip: !open || kind !== 'talent' });
  const vendor = useGetVendorQuery(slug, { skip: !open || kind !== 'vendor' });
  const listing = kind === 'talent' ? talent.data : vendor.data;
  const loading = kind === 'talent' ? talent.isLoading : vendor.isLoading;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-ink/40 p-0 sm:p-4">
      <button type="button" className="absolute inset-0" aria-label={t('drawer.close')} onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-card-xl sm:max-h-[90dvh] sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-10 bg-white px-5 py-4">
          <h3 className="text-lg font-extrabold text-ink">{kind === 'talent' ? t('drawer.talentProfile') : t('drawer.vendorProfile')}</h3>
          <button
            type="button"
            className="rounded-full border border-ink-10 p-2 text-ink-60 hover:bg-ink-5"
            onClick={onClose}
            aria-label={t('drawer.close')}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="p-5">
          {loading ? (
            <p className="text-[14px] text-ink-50">{t('loading', { ns: 'common' })}</p>
          ) : listing ? (
            <>
              {listing.coverImageUrl ? (
                <img
                  src={listing.coverImageUrl}
                  alt=""
                  className="mb-4 aspect-video w-full rounded-2xl object-cover"
                />
              ) : null}
              <p className="text-xl font-extrabold text-ink">{listing.displayName}</p>
              {listing.headline ? <p className="mt-1 text-[14px] text-ink-60">{listing.headline}</p> : null}
              <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-ink-50">
                {listing.city ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    {listing.city}
                  </span>
                ) : null}
                {listing.ratingSummary ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-lemon" strokeWidth={2} aria-hidden />
                    {listing.ratingSummary}
                  </span>
                ) : null}
              </div>
              <Button type="button" variant="dark" size="md" className="mt-6 w-full" onClick={onRequest}>
                {kind === 'talent' ? t('drawer.requestTalent') : t('drawer.requestVendor')}
              </Button>
            </>
          ) : (
            <p className="text-[14px] text-ink-50">{t('drawer.notFound')}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
