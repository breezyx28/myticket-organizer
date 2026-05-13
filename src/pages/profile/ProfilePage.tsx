import { Button } from '@/components/ui/Button';
import { VenueLocationMap } from '@/components/profile/VenueLocationMap';
import { GalleryDropZone } from '@/components/ui/GalleryDropZone';
import { SaudiPhoneInput } from '@/components/ui/SaudiPhoneInput';
import { UploadTileInput } from '@/components/ui/UploadTileInput';
import { isProfileComplete, loadProfileBundle, saveOrganizerProfile, uploadProfileDocument, uploadProfileGalleryImage, uploadProfileLogo, type ProfileResourceContext } from '@/services/profileService';
import type { OrganizerUser } from '@/types/domain';
import { useListSaudiCitiesQuery, useListSaudiRegionsQuery } from '@/store/api/referenceApi';
import { Briefcase, Building2, FileText, FolderOpen, ImageIcon, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ProfileTab = 'info' | 'venue' | 'organization' | 'documents';

function displayFileLabel(value: string) {
  const galleryNamed = value.match(/^file:(.+):[a-z0-9]+$/i);
  if (galleryNamed) return galleryNamed[1].replace(/_/g, ' ');
  return value.replace(/^(file|upload|document|image):/i, '').trim() || value;
}

function isRemoteMediaUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('/');
}

function mergeOrganization(
  o: OrganizerUser['organization'] | undefined,
  partial: Partial<NonNullable<OrganizerUser['organization']>>
): OrganizerUser['organization'] {
  return { ...(o ?? { previousEvents: [], categories: [] }), ...partial };
}

export function ProfilePage() {
  const [p, setP] = useState<OrganizerUser | null>(null);
  const [resourceCtx, setResourceCtx] = useState<ProfileResourceContext | null>(null);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('info');
  const [profileRegionId, setProfileRegionId] = useState('');
  const [venueRegionId, setVenueRegionId] = useState('');
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [galleryUploadError, setGalleryUploadError] = useState<string | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [facilityInput, setFacilityInput] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [galleryPreviewByKey, setGalleryPreviewByKey] = useState<Record<string, string>>({});
  const previewUrlsRef = useRef<Set<string>>(new Set());
  /** Region dropdowns are local state; do not re-derive from `p` on every keystroke or selects reset / flash. */
  const regionIdsHydratedRef = useRef(false);

  const trackPreview = useCallback((url: string) => {
    previewUrlsRef.current.add(url);
    return url;
  }, []);

  const revokePreview = useCallback((url: string | undefined) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      previewUrlsRef.current.delete(url);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadProfileBundle().then(({ user, resourceCtx: ctx }) => {
        setP(user);
        setResourceCtx(ctx);
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!p) {
      regionIdsHydratedRef.current = false;
      return;
    }
    if (regionIdsHydratedRef.current) return;
    regionIdsHydratedRef.current = true;
    const t = window.setTimeout(() => {
      setProfileRegionId((p.regionId && p.regionId.trim()) || '');
      setVenueRegionId((p.venue?.regionId && p.venue.regionId.trim()) || '');
    }, 0);
    return () => window.clearTimeout(t);
  }, [p]);

  useEffect(() => {
    const ref = previewUrlsRef;
    return () => {
      const urls = ref.current;
      urls.forEach((u) => {
        if (u.startsWith('blob:')) URL.revokeObjectURL(u);
      });
      urls.clear();
    };
  }, []);

  const patch = useCallback((next: Partial<OrganizerUser>) => {
    setP((cur) => (cur ? { ...cur, ...next } : cur));
  }, []);

  const { data: refRegions = [], isLoading: refRegionsLoading, isError: refRegionsError } = useListSaudiRegionsQuery();
  const { data: profileCities = [], isFetching: profileCitiesFetching } = useListSaudiCitiesQuery(profileRegionId, {
    skip: !profileRegionId,
  });
  const { data: venueCities = [], isFetching: venueCitiesFetching } = useListSaudiCitiesQuery(venueRegionId, {
    skip: !venueRegionId,
  });

  const galleryItems = useMemo(() => {
    if (!p) return [];
    return (p.gallery ?? []).map((key) => ({
      key,
      label: displayFileLabel(key),
      previewUrl: galleryPreviewByKey[key] ?? (isRemoteMediaUrl(key) ? key : undefined),
    }));
  }, [p, galleryPreviewByKey]);

  if (!p || !resourceCtx) return <div className="py-20 text-center text-ink-60">Loading…</div>;

  const ok = isProfileComplete(p);

  const logoDisplaySrc =
    logoPreviewUrl ?? (p.logoUrl && (isRemoteMediaUrl(p.logoUrl) || p.logoUrl.startsWith('blob:')) ? p.logoUrl : null);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Account</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Organizer profile</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-60">
          Complete your profile before creating events. Use the tabs below; document and gallery files upload to the organizer API, and other changes apply when you save.
        </p>
      </div>

      {!ok ? (
        <div className="rounded-3xl border border-coral/40 bg-coral/10 px-5 py-4 text-[14px] text-ink">
          <strong>Incomplete.</strong> Upload your organization document and at least one gallery image (URLs are saved to your profile), add venue capacity &amp; facilities, and complete your organizer details. Use <strong>Save profile</strong> at the bottom after edits.
        </div>
      ) : (
        <div className="rounded-3xl border border-mint/40 bg-mint/15 px-5 py-4 text-[14px] text-ink">
          <strong>Profile complete.</strong> You can create and publish events.
        </div>
      )}

      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ['info', 'Info & contact', UserRound] as const,
            ['venue', 'Venue', Building2] as const,
            ['organization', 'Organization', Briefcase] as const,
            ['documents', 'Documents & media', FolderOpen] as const,
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-center text-[11px] font-bold leading-tight sm:flex-row sm:gap-2 sm:px-3 sm:text-[12px] ${
              tab === id ? 'bg-ink text-white shadow-card-sm' : 'bg-ink-5 text-ink-60 ring-1 ring-ink-10 hover:bg-ink-5/80'
            }`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
            <span className="max-w-[9rem] sm:max-w-none">{label}</span>
          </button>
        ))}
      </div>

      <form
        className="space-y-0 overflow-visible rounded-3xl border border-ink-10 bg-white shadow-card-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          const bundle = await saveOrganizerProfile(p, resourceCtx);
          setP(bundle.user);
          setResourceCtx(bundle.resourceCtx);
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2000);
        }}
      >
        {tab === 'info' ? (
          <section className="space-y-6 p-6 md:p-8">
            <h2 className="text-lg font-extrabold text-ink">Personal &amp; contact</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="block text-[12px] font-semibold text-ink-60">
                Display name
                <input
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                  value={p.displayName}
                  onChange={(e) => patch({ displayName: e.target.value })}
                  required
                />
              </label>
              <div className="block text-[12px] font-semibold text-ink-60">
                Phone
                <SaudiPhoneInput className="mt-1.5" value={p.phone} onChange={(next) => patch({ phone: next })} />
              </div>
              <label className="block text-[12px] font-semibold text-ink-60">
                Saudi region
                <select
                  className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-3 py-2.5 text-[14px]"
                  value={profileRegionId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setProfileRegionId(id);
                    patch({ city: '', cityId: '', regionId: id });
                  }}
                  disabled={refRegionsLoading}
                >
                  <option value="">{refRegionsLoading ? 'Loading regions…' : 'Select region'}</option>
                  {refRegions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {refRegionsError ? (
                  <p className="mt-1 text-[11px] text-coral">Could not load regions. Check API base URL and try again.</p>
                ) : null}
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                City
                <select
                  className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-3 py-2.5 text-[14px]"
                  value={p.cityId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const label = id ? (profileCities.find((c) => c.id === id)?.name ?? '') : '';
                    patch({ cityId: id, city: label, regionId: profileRegionId });
                  }}
                  disabled={!profileRegionId || profileCitiesFetching || refRegionsLoading}
                >
                  <option value="">
                    {!profileRegionId
                      ? 'Choose a region first'
                      : profileCitiesFetching
                        ? 'Loading cities…'
                        : 'Select city'}
                  </option>
                  {profileCities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2">
                <p className="text-[12px] font-semibold text-ink-60">Logo</p>
                <p className="mt-0.5 text-[11px] text-ink-40">PNG, JPG, or WebP — max 4 MB. Uploads to the organizer API and sets your public logo URL.</p>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-ink-10 bg-ink-5 ring-1 ring-ink/5">
                    {logoDisplaySrc ? (
                      <img src={logoDisplaySrc} alt="" className="h-full w-full object-cover" />
                    ) : p.logoUrl && !isRemoteMediaUrl(p.logoUrl) ? (
                      <ImageIcon className="h-10 w-10 text-ink-30" strokeWidth={1.25} />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-ink-30" strokeWidth={1.25} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <UploadTileInput
                      title="Upload logo"
                      subtitle="PNG, JPG, or WebP — max 4 MB"
                      accept="image/png,image/jpeg,image/webp"
                      onPick={(file) => {
                        void (async () => {
                          revokePreview(logoPreviewUrl ?? undefined);
                          setLogoUploadError(null);
                          try {
                            const url = await uploadProfileLogo(file);
                            setLogoPreviewUrl(null);
                            patch({ logoUrl: url });
                          } catch (err) {
                            setLogoUploadError(err instanceof Error ? err.message : 'Logo upload failed');
                            const url = trackPreview(URL.createObjectURL(file));
                            setLogoPreviewUrl(url);
                          }
                        })();
                      }}
                    />
                    {logoUploadError ? <p className="text-[12px] font-semibold text-coral">{logoUploadError}</p> : null}
                    {(p.logoUrl || logoPreviewUrl) && (
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-60">
                        <span className="truncate font-mono text-[11px]">{displayFileLabel(p.logoUrl || 'upload')}</span>
                        <button
                          type="button"
                          className="font-semibold text-coral hover:underline"
                          onClick={() => {
                            revokePreview(logoPreviewUrl ?? undefined);
                            setLogoPreviewUrl(null);
                            setLogoUploadError(null);
                            patch({ logoUrl: '' });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <label className="block text-[12px] font-semibold text-ink-60 md:col-span-2">
                Bio (min 30 chars)
                <textarea
                  rows={5}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                  value={p.bio}
                  onChange={(e) => patch({ bio: e.target.value })}
                />
              </label>
            </div>
          </section>
        ) : null}

        {tab === 'venue' ? (
          <section className="space-y-6 p-6 md:p-8">
            <h2 className="text-lg font-extrabold text-ink">Venue details</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="block text-[12px] font-semibold text-ink-60">
                Venue name
                <input
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                  value={p.venue?.name ?? ''}
                  onChange={(e) =>
                    patch({
                      venue: { ...(p.venue ?? { city: p.city, capacity: null, facilities: [], address: '' }), name: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                Venue region
                <select
                  className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-3 py-2.5 text-[14px]"
                  value={venueRegionId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setVenueRegionId(id);
                    patch({
                      venue: {
                        ...(p.venue ?? { name: p.displayName, capacity: null, facilities: [], address: '' }),
                        city: '',
                        regionId: id,
                        cityId: '',
                      },
                    });
                  }}
                  disabled={refRegionsLoading}
                >
                  <option value="">{refRegionsLoading ? 'Loading regions…' : 'Select region'}</option>
                  {refRegions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                Venue city
                <select
                  className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-3 py-2.5 text-[14px]"
                  value={p.venue?.cityId ?? ''}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const rid = venueRegionId || p.venue?.regionId || '';
                    const cityName = cid ? (venueCities.find((c) => c.id === cid)?.name ?? '') : '';
                    patch({
                      venue: {
                        ...(p.venue ?? { name: p.displayName, capacity: null, facilities: [], address: '' }),
                        city: cityName,
                        regionId: rid,
                        cityId: cid,
                      },
                    });
                  }}
                  disabled={(!venueRegionId && !p.venue?.regionId) || venueCitiesFetching || refRegionsLoading}
                >
                  <option value="">
                    {!venueRegionId && !p.venue?.regionId
                      ? 'Choose a region first'
                      : venueCitiesFetching
                        ? 'Loading cities…'
                        : 'Select city'}
                  </option>
                  {venueCities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[12px] font-semibold text-ink-60 md:col-span-2">
                Address
                <input
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                  value={p.venue?.address ?? ''}
                  onChange={(e) =>
                    patch({
                      venue: { ...(p.venue ?? { name: p.displayName, city: p.city, capacity: null, facilities: [] }), address: e.target.value },
                    })
                  }
                />
              </label>
              <VenueLocationMap
                visible={tab === 'venue'}
                latitude={p.venue?.latitude ?? null}
                longitude={p.venue?.longitude ?? null}
                onCoordinatesChange={(lat, lng) =>
                  patch({
                    venue: {
                      ...(p.venue ?? {
                        name: p.displayName,
                        city: p.city,
                        address: '',
                        capacity: null,
                        facilities: [],
                      }),
                      latitude: lat,
                      longitude: lng,
                    },
                  })
                }
              />
              <label className="block text-[12px] font-semibold text-ink-60">
                Max audience capacity
                <input
                  type="number"
                  min={0}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 font-mono text-[14px]"
                  value={p.venue?.capacity ?? ''}
                  onChange={(e) =>
                    patch({
                      venue: {
                        ...(p.venue ?? { name: p.displayName, city: p.city, address: '', facilities: [] }),
                        capacity: e.target.value ? Number(e.target.value) : null,
                      },
                    })
                  }
                />
              </label>
              <div className="md:col-span-2">
                <p className="text-[12px] font-semibold text-ink-60">Facilities</p>
                <p className="mt-0.5 text-[11px] text-ink-40">Add amenities (Enter or Add), required for a complete profile.</p>
                <div className="mt-2 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                    placeholder="e.g. VIP boxes"
                    value={facilityInput}
                    onChange={(e) => setFacilityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const v = facilityInput.trim();
                      if (!v) return;
                      const list = p.venue?.facilities ?? [];
                      if (list.some((x) => x.toLowerCase() === v.toLowerCase())) {
                        setFacilityInput('');
                        return;
                      }
                      patch({
                        venue: {
                          ...(p.venue ?? { name: p.displayName, city: p.city, address: '', capacity: null }),
                          facilities: [...list, v],
                        },
                      });
                      setFacilityInput('');
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      const v = facilityInput.trim();
                      if (!v) return;
                      const list = p.venue?.facilities ?? [];
                      if (list.some((x) => x.toLowerCase() === v.toLowerCase())) return;
                      patch({
                        venue: {
                          ...(p.venue ?? { name: p.displayName, city: p.city, address: '', capacity: null }),
                          facilities: [...list, v],
                        },
                      });
                      setFacilityInput('');
                    }}
                  >
                    Add
                  </Button>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {(p.venue?.facilities ?? []).map((f) => (
                    <li
                      key={f}
                      className="inline-flex items-center gap-1.5 rounded-full bg-mint/20 px-3 py-1.5 text-[12px] font-semibold text-ink ring-1 ring-mint/40"
                    >
                      {f}
                      <button
                        type="button"
                        className="text-coral hover:underline"
                        onClick={() =>
                          patch({
                            venue: {
                              ...(p.venue ?? { name: p.displayName, city: p.city, address: '', capacity: null }),
                              facilities: (p.venue?.facilities ?? []).filter((x) => x !== f),
                            },
                          })
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {tab === 'organization' ? (
          <section className="space-y-6 p-6 md:p-8">
            <h2 className="text-lg font-extrabold text-ink">Organization</h2>
            <p className="max-w-2xl text-[12px] text-ink-60">
              Social links are saved via the organizer API when you click <strong>Save profile</strong> at the bottom of the page.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="block text-[12px] font-semibold text-ink-60">
                Website
                <input
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                  value={p.organization?.website ?? ''}
                  onChange={(e) => patch({ organization: mergeOrganization(p.organization, { website: e.target.value }) })}
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                Instagram
                <input
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                  value={p.organization?.instagram ?? ''}
                  onChange={(e) => patch({ organization: mergeOrganization(p.organization, { instagram: e.target.value }) })}
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                Twitter / X
                <input
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                  value={p.organization?.twitter ?? ''}
                  onChange={(e) => patch({ organization: mergeOrganization(p.organization, { twitter: e.target.value }) })}
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                TikTok
                <input
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                  value={p.organization?.tiktok ?? ''}
                  onChange={(e) => patch({ organization: mergeOrganization(p.organization, { tiktok: e.target.value }) })}
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                Typical event duration (hours)
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 font-mono text-[14px]"
                  value={p.organization?.typicalEventDurationHours ?? ''}
                  onChange={(e) =>
                    patch({
                      organization: mergeOrganization(p.organization, {
                        typicalEventDurationHours: e.target.value ? Number(e.target.value) : null,
                      }),
                    })
                  }
                />
              </label>
            </div>
          </section>
        ) : null}

        {tab === 'documents' ? (
          <section className="space-y-8 p-6 md:p-8">
            <h2 className="text-lg font-extrabold text-ink">Documents &amp; media</h2>

            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-ink-60">Organization document (required)</p>
              <p className="text-[11px] text-ink-40">
                PDF or image — uploads immediately to the organizer API, then the public URL is stored when you save the profile.
              </p>
              {docUploadError ? <p className="text-[12px] text-coral">{docUploadError}</p> : null}
              {p.organizationDocument ? (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-10 bg-ink-5/50 px-4 py-3">
                  <FileText className="h-9 w-9 shrink-0 text-coral" strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{displayFileLabel(p.organizationDocument)}</p>
                    <p className="text-[11px] text-ink-40">
                      {/^https?:\/\//i.test(p.organizationDocument) ? 'Stored URL' : 'Not uploaded yet'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-coral hover:underline"
                    onClick={() => {
                      setDocUploadError(null);
                      patch({ organizationDocument: '' });
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              <UploadTileInput
                title={docUploading ? 'Uploading…' : 'Upload organization document'}
                subtitle="PDF, scan, or photo of CR / permit (max 12 MB)"
                accept="image/*,.pdf,application/pdf"
                className={docUploading ? 'pointer-events-none opacity-60' : undefined}
                onPick={(file) => {
                  setDocUploadError(null);
                  setDocUploading(true);
                  void uploadProfileDocument(file)
                    .then((url) => {
                      patch({ organizationDocument: url });
                    })
                    .catch((err: unknown) => {
                      setDocUploadError(err instanceof Error ? err.message : 'Document upload failed.');
                    })
                    .finally(() => setDocUploading(false));
                }}
              />
            </div>

            <div className="space-y-3 border-t border-ink-10 pt-8">
              <p className="text-[12px] font-semibold text-ink-60">Gallery images</p>
              <p className="text-[11px] text-ink-40">
                Each image uploads to the organizer API when selected; public URLs are appended to your profile. Remove items you do not want, then use <strong>Save profile</strong> to persist the gallery list.
              </p>
              {galleryUploadError ? <p className="text-[12px] text-coral">{galleryUploadError}</p> : null}
              {galleryUploading ? <p className="text-[12px] text-ink-60">Uploading images…</p> : null}
              <GalleryDropZone
                items={galleryItems}
                onAddFiles={(files) => {
                  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
                  if (!imageFiles.length) return;
                  setGalleryUploadError(null);
                  setGalleryUploading(true);
                  void (async () => {
                    try {
                      for (const f of imageFiles) {
                        const url = await uploadProfileGalleryImage(f);
                        setP((cur) => (cur ? { ...cur, gallery: [...(cur.gallery ?? []), url] } : cur));
                        setGalleryPreviewByKey((prev) => ({ ...prev, [url]: url }));
                      }
                    } catch (err: unknown) {
                      setGalleryUploadError(err instanceof Error ? err.message : 'Gallery upload failed.');
                    } finally {
                      setGalleryUploading(false);
                    }
                  })();
                }}
                onRemove={(key) => {
                  setGalleryPreviewByKey((prev) => {
                    const url = prev[key];
                    if (url && url.startsWith('blob:')) revokePreview(url);
                    const rest = { ...prev };
                    delete rest[key];
                    return rest;
                  });
                  setP((cur) => (cur ? { ...cur, gallery: (cur.gallery ?? []).filter((k) => k !== key) } : cur));
                }}
              />
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-ink-10 bg-ink-5/30 px-6 py-5 md:px-8">
          <Button type="submit" variant="dark" size="md">
            Save profile
          </Button>
          {saved ? <span className="text-[13px] font-semibold text-mint-dark">Saved</span> : null}
        </div>
      </form>
    </div>
  );
}
