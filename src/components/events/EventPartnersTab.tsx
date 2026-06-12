import { useState } from 'react';
import { MarketplaceBrowseSection } from '@/components/marketplace/MarketplaceBrowseSection';
import { MarketplaceProfileDrawer } from '@/components/marketplace/MarketplaceProfileDrawer';
import { StartConversationDialog } from '@/components/engagements/StartConversationDialog';
import type { OrganizerEvent, TalentListing, VendorListing } from '@/types/domain';
import { Link } from 'react-router-dom';

type RequestTarget = { kind: 'talent' | 'vendor'; listing: TalentListing | VendorListing };

export function EventPartnersTab({
  event,
  onPatch,
}: {
  event: OrganizerEvent;
  onPatch: (patch: Partial<OrganizerEvent>) => void;
}) {
  const [requestTarget, setRequestTarget] = useState<RequestTarget | null>(null);
  const [drawer, setDrawer] = useState<{ kind: 'talent' | 'vendor'; slug: string } | null>(null);
  const [listingCache, setListingCache] = useState<Record<string, TalentListing | VendorListing>>({});

  function rememberListing(listing: TalentListing | VendorListing) {
    setListingCache((prev) => ({ ...prev, [`${listing.slug}`]: listing }));
  }

  return (
    <div className="space-y-12">
      <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold tracking-tight text-ink">Event visibility</h2>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-60">
          Control whether linked partners appear on the public event page.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:gap-8">
          <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ink-20"
              checked={event.showTalents}
              onChange={(e) => onPatch({ showTalents: e.target.checked })}
            />
            Show talents on event page
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ink-20"
              checked={event.showVendors}
              onChange={(e) => onPatch({ showVendors: e.target.checked })}
            />
            Show vendors on event page
          </label>
        </div>
      </section>

      {event.talents.length > 0 || event.vendors.length > 0 ? (
        <section className="rounded-3xl border border-ink-10 bg-surface-tint/60 p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold tracking-tight text-ink">Linked partners</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {[...event.talents, ...event.vendors].map((p) => (
              <li
                key={`${p.role}-${p.id}`}
                className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ink ring-1 ring-ink-10"
              >
                {p.displayName} · {p.role}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-ink-50">
            Manage hiring requests in{' '}
            <Link to="/engagements" className="font-semibold text-coral hover:underline">
              Engagements
            </Link>
            .
          </p>
        </section>
      ) : null}

      <div className="space-y-14">
        <MarketplaceBrowseSection
          kind="talent"
          title="Request a talent for your event"
          description="Browse all approved marketplace talents. Use search and filters to narrow by specialty, region, or city."
          categoryFieldLabel="Talent category"
          onRequest={(listing) => {
            rememberListing(listing);
            setRequestTarget({ kind: 'talent', listing: listing as TalentListing });
          }}
          onViewDetails={(listing) => {
            rememberListing(listing);
            setDrawer({ kind: 'talent', slug: listing.slug });
          }}
        />

        <MarketplaceBrowseSection
          kind="vendor"
          title="Services for your event"
          description="Browse all approved vendors — catering, AV, décor, and more. Refine by service type or location when needed."
          categoryFieldLabel="Service category"
          onRequest={(listing) => {
            rememberListing(listing);
            setRequestTarget({ kind: 'vendor', listing: listing as VendorListing });
          }}
          onViewDetails={(listing) => {
            rememberListing(listing);
            setDrawer({ kind: 'vendor', slug: listing.slug });
          }}
        />
      </div>

      <StartConversationDialog
        open={requestTarget != null}
        target={requestTarget?.listing ?? null}
        kind={requestTarget?.kind ?? 'talent'}
        eventId={event.id}
        eventTitle={event.title}
        onClose={() => setRequestTarget(null)}
      />

      <MarketplaceProfileDrawer
        open={drawer != null}
        kind={drawer?.kind ?? 'talent'}
        slug={drawer?.slug ?? ''}
        onClose={() => setDrawer(null)}
        onRequest={() => {
          if (!drawer) return;
          const listing = listingCache[drawer.slug];
          if (listing) {
            setDrawer(null);
            setRequestTarget({ kind: drawer.kind, listing });
          }
        }}
      />
    </div>
  );
}
