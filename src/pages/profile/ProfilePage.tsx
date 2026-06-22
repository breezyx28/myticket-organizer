import { Button } from '@/components/ui/Button';
import { VenueLocationMap } from '@/components/maps/VenueLocationMap';
import { GalleryDropZone } from '@/components/ui/GalleryDropZone';
import { SaudiPhoneInput } from '@/components/ui/SaudiPhoneInput';
import { UploadTileInput } from '@/components/ui/UploadTileInput';
import { firstMessagesFromApiError, pickApiFieldMessage } from '@/lib/api/apiValidationErrors';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import { toast } from '@/lib/appToast';
import { cn } from '@/lib/utils';
import { isProfileComplete, loadProfileBundle, saveOrganizerProfile, uploadProfileDocument, uploadProfileGalleryImage, uploadProfileImage, uploadProfileLogo, clearProfileImage, type ProfileResourceContext } from '@/services/profileService';
import type { OrganizerUser } from '@/types/domain';
import { useListSaudiCitiesQuery, useListSaudiRegionsQuery } from '@/store/api/referenceApi';
import { useLocale } from '@/hooks/useLocale';
import { pickLocalizedRefName } from '@/lib/locale/localizedRefName';
import { validateProfileBeforeSave } from '@/lib/profile/validateProfileForm';
import { Briefcase, Building2, FileText, FolderOpen, ImageIcon, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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

function profileSaveFieldErrorsFromApi(e: unknown): Record<string, string> {
  const raw = firstMessagesFromApiError(e);
  const out: Record<string, string> = {};
  const add = (ui: string, ...keys: string[]) => {
    const m = pickApiFieldMessage(raw, ...keys);
    if (m) out[ui] = m;
  };
  add('displayName', 'display_name', 'displayName');
  add('phone', 'phone');
  add('bio', 'bio');
  add('regionId', 'region_id');
  add('cityId', 'city_id', 'city');
  add('organizationDocument', 'organization_document');
  add('gallery', 'gallery');
  add('venueName', 'venue.name', 'venue_name');
  add('venueAddress', 'venue.address', 'venue_address', 'address');
  add('venueCapacity', 'venue.capacity', 'capacity');
  add('venueRegionId', 'venue.region_id', 'venue_region_id');
  add('venueCityId', 'venue.city_id', 'venue_city_id');
  return out;
}

export function ProfilePage() {
  const { t } = useTranslation(['profile', 'common']);
  const { language } = useLocale();
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
  const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState<string | null>(null);
  const [profileImageUploadError, setProfileImageUploadError] = useState<string | null>(null);
  const [profileImageRemoving, setProfileImageRemoving] = useState(false);
  const [saveFieldErrors, setSaveFieldErrors] = useState<Record<string, string>>({});
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
    setSaveFieldErrors({});
  }, [tab]);

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

  if (!p || !resourceCtx) return <div className="py-20 text-center text-ink-60">{t('loading', { ns: 'common' })}</div>;

  const ok = isProfileComplete(p);

  const logoDisplaySrc =
    logoPreviewUrl ?? (p.logoUrl && (isRemoteMediaUrl(p.logoUrl) || p.logoUrl.startsWith('blob:')) ? p.logoUrl : null);

  const profileImageDisplaySrc =
    profileImagePreviewUrl ??
    (p.profileImageUrl && (isRemoteMediaUrl(p.profileImageUrl) || p.profileImageUrl.startsWith('blob:'))
      ? p.profileImageUrl
      : null);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">{t('page.eyebrow')}</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t('page.title')}</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-60">{t('page.description')}</p>
      </div>

      {!ok ? (
        <div className="rounded-3xl border border-coral/40 bg-coral/10 px-5 py-4 text-[14px] text-ink">
          <strong>{t('status.incomplete.title')}</strong> {t('status.incomplete.body')}
        </div>
      ) : (
        <div className="rounded-3xl border border-mint/40 bg-mint/15 px-5 py-4 text-[14px] text-ink">
          <strong>{t('status.complete.title')}</strong> {t('status.complete.body')}
        </div>
      )}

      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ['info', t('tabs.info'), UserRound] as const,
            ['venue', t('tabs.venue'), Building2] as const,
            ['organization', t('tabs.organization'), Briefcase] as const,
            ['documents', t('tabs.documents'), FolderOpen] as const,
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
          const clientErrors = validateProfileBeforeSave(p, (key) => t(key as never));
          if (Object.keys(clientErrors).length > 0) {
            setSaveFieldErrors(clientErrors);
            toast.error(t('validation.fixBeforeSave'));
            return;
          }
          setSaveFieldErrors({});
          try {
            const bundle = await saveOrganizerProfile(p, resourceCtx);
            setP(bundle.user);
            setResourceCtx(bundle.resourceCtx);
            setSaved(true);
            toast.success(t('toasts.saved'));
            window.setTimeout(() => setSaved(false), 2000);
          } catch (err) {
            setSaveFieldErrors(profileSaveFieldErrorsFromApi(err));
            toast.error(formatOrganizerApiError(err));
          }
        }}
      >
        {tab === 'info' ? (
          <section className="space-y-6 p-6 md:p-8">
            <h2 className="text-lg font-extrabold text-ink">{t('sections.personalContact')}</h2>
            <div className="md:col-span-2">
              <p className="text-[12px] font-semibold text-ink-60">{t('fields.profilePhoto')}</p>
              <p className="mt-0.5 text-[11px] text-ink-40">{t('fields.profilePhotoHint')}</p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink-10 bg-ink-5 ring-1 ring-ink/5">
                  {profileImageDisplaySrc ? (
                    <img src={profileImageDisplaySrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-10 w-10 text-ink-30" strokeWidth={1.25} aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <UploadTileInput
                    title={t('upload.profilePhoto')}
                    subtitle={t('upload.profilePhotoSubtitle')}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onPick={(file) => {
                      void (async () => {
                        revokePreview(profileImagePreviewUrl ?? undefined);
                        setProfileImageUploadError(null);
                        try {
                          const url = await uploadProfileImage(file, p.id);
                          setProfileImagePreviewUrl(null);
                          patch({ profileImageUrl: url });
                          toast.success(t('toasts.photoUpdated'));
                        } catch (err) {
                          setProfileImageUploadError(err instanceof Error ? err.message : t('errors.photoUploadFailed'));
                          const url = trackPreview(URL.createObjectURL(file));
                          setProfileImagePreviewUrl(url);
                        }
                      })();
                    }}
                  />
                  {profileImageUploadError ? (
                    <p className="text-[12px] font-semibold text-coral">{profileImageUploadError}</p>
                  ) : null}
                  {(p.profileImageUrl || profileImagePreviewUrl) && (
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-60">
                      <span className="truncate font-mono text-[11px]">
                        {displayFileLabel(p.profileImageUrl || 'upload')}
                      </span>
                      <button
                        type="button"
                        className="font-semibold text-coral hover:underline disabled:opacity-50"
                        disabled={profileImageRemoving}
                        onClick={() => {
                          void (async () => {
                            revokePreview(profileImagePreviewUrl ?? undefined);
                            setProfileImagePreviewUrl(null);
                            setProfileImageUploadError(null);
                            setProfileImageRemoving(true);
                            try {
                              await clearProfileImage(p.id);
                              patch({ profileImageUrl: '' });
                              toast.success(t('toasts.photoRemoved'));
                            } catch (err) {
                              setProfileImageUploadError(
                                err instanceof Error ? err.message : t('errors.photoRemoveFailed')
                              );
                            } finally {
                              setProfileImageRemoving(false);
                            }
                          })();
                        }}
                      >
                        {profileImageRemoving ? t('removing', { ns: 'common' }) : t('remove', { ns: 'common' })}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="block text-[12px] font-semibold text-ink-60">
                {t('fields.displayName')}
                <input
                  className={cn(
                    'mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[14px]',
                    saveFieldErrors.displayName ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
                  value={p.displayName}
                  onChange={(e) => patch({ displayName: e.target.value })}
                  required
                />
                {saveFieldErrors.displayName ? (
                  <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.displayName}</p>
                ) : null}
              </label>
              <div className="block text-[12px] font-semibold text-ink-60">
                {t('fields.phone')}
                <SaudiPhoneInput
                  className={cn(
                    'mt-1.5',
                    saveFieldErrors.phone ? 'border-coral ring-2 ring-coral/25' : ''
                  )}
                  value={p.phone}
                  onChange={(next) => patch({ phone: next })}
                />
                {saveFieldErrors.phone ? <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.phone}</p> : null}
              </div>
              <label className="block text-[12px] font-semibold text-ink-60">
                {t('fields.saudiRegion')}
                <select
                  className={cn(
                    'mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-[14px]',
                    saveFieldErrors.regionId ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
                  value={profileRegionId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setProfileRegionId(id);
                    patch({ city: '', cityId: '', regionId: id });
                  }}
                  disabled={refRegionsLoading}
                >
                  <option value="">{refRegionsLoading ? t('select.loadingRegions') : t('select.selectRegion')}</option>
                  {refRegions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {pickLocalizedRefName(r, language)}
                    </option>
                  ))}
                </select>
                {refRegionsError ? (
                  <p className="mt-1 text-[11px] text-coral">{t('errors.regionsLoadFailed')}</p>
                ) : null}
                {saveFieldErrors.regionId ? (
                  <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.regionId}</p>
                ) : null}
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                {t('fields.city')}
                <select
                  className={cn(
                    'mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-[14px]',
                    saveFieldErrors.cityId ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
                  value={p.cityId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const city = id ? profileCities.find((c) => c.id === id) : undefined;
                    patch({
                      cityId: id,
                      city: city ? pickLocalizedRefName(city, language) : '',
                      regionId: profileRegionId,
                    });
                  }}
                  disabled={!profileRegionId || profileCitiesFetching || refRegionsLoading}
                >
                  <option value="">
                    {!profileRegionId
                      ? t('select.chooseRegionFirst')
                      : profileCitiesFetching
                        ? t('select.loadingCities')
                        : t('select.selectCity')}
                  </option>
                  {profileCities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {pickLocalizedRefName(c, language)}
                    </option>
                  ))}
                </select>
                {saveFieldErrors.cityId ? (
                  <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.cityId}</p>
                ) : null}
              </label>
              <div className="md:col-span-2">
                <p className="text-[12px] font-semibold text-ink-60">{t('fields.businessLogo')}</p>
                <p className="mt-0.5 text-[11px] text-ink-40">{t('fields.businessLogoHint')}</p>
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
                      title={t('upload.logo')}
                      subtitle={t('upload.logoSubtitle')}
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
                            setLogoUploadError(err instanceof Error ? err.message : t('errors.logoUploadFailed'));
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
                          {t('remove', { ns: 'common' })}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <label className="block text-[12px] font-semibold text-ink-60 md:col-span-2">
                {t('fields.bio')}
                <textarea
                  rows={5}
                  className={cn(
                    'mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[14px]',
                    saveFieldErrors.bio ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
                  value={p.bio}
                  onChange={(e) => patch({ bio: e.target.value })}
                />
                {saveFieldErrors.bio ? <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.bio}</p> : null}
              </label>
            </div>
          </section>
        ) : null}

        {tab === 'venue' ? (
          <section className="space-y-6 p-6 md:p-8">
            <h2 className="text-lg font-extrabold text-ink">{t('sections.venueDetails')}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="block text-[12px] font-semibold text-ink-60">
                {t('fields.venueName')}
                <input
                  className={cn(
                    'mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[14px]',
                    saveFieldErrors.venueName ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
                  value={p.venue?.name ?? ''}
                  onChange={(e) =>
                    patch({
                      venue: { ...(p.venue ?? { city: p.city, capacity: null, facilities: [], address: '' }), name: e.target.value },
                    })
                  }
                />
                {saveFieldErrors.venueName ? (
                  <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.venueName}</p>
                ) : null}
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                {t('fields.venueRegion')}
                <select
                  className={cn(
                    'mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-[14px]',
                    saveFieldErrors.venueRegionId ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
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
                  <option value="">{refRegionsLoading ? t('select.loadingRegions') : t('select.selectRegion')}</option>
                  {refRegions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {pickLocalizedRefName(r, language)}
                    </option>
                  ))}
                </select>
                {saveFieldErrors.venueRegionId ? (
                  <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.venueRegionId}</p>
                ) : null}
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                {t('fields.venueCity')}
                <select
                  className={cn(
                    'mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-[14px]',
                    saveFieldErrors.venueCityId ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
                  value={p.venue?.cityId ?? ''}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const rid = venueRegionId || p.venue?.regionId || '';
                    const city = cid ? venueCities.find((c) => c.id === cid) : undefined;
                    const cityName = city ? pickLocalizedRefName(city, language) : '';
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
                      ? t('select.chooseRegionFirst')
                      : venueCitiesFetching
                        ? t('select.loadingCities')
                        : t('select.selectCity')}
                  </option>
                  {venueCities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {pickLocalizedRefName(c, language)}
                    </option>
                  ))}
                </select>
                {saveFieldErrors.venueCityId ? (
                  <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.venueCityId}</p>
                ) : null}
              </label>
              <label className="block text-[12px] font-semibold text-ink-60 md:col-span-2">
                {t('fields.address')}
                <input
                  className={cn(
                    'mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[14px]',
                    saveFieldErrors.venueAddress ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
                  value={p.venue?.address ?? ''}
                  onChange={(e) =>
                    patch({
                      venue: { ...(p.venue ?? { name: p.displayName, city: p.city, capacity: null, facilities: [] }), address: e.target.value },
                    })
                  }
                />
                {saveFieldErrors.venueAddress ? (
                  <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.venueAddress}</p>
                ) : null}
              </label>
              <VenueLocationMap
                visible={tab === 'venue'}
                latitude={p.venue?.latitude ?? null}
                longitude={p.venue?.longitude ?? null}
                hint={t('map.coordinatesHint')}
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
                {t('fields.maxCapacity')}
                <input
                  type="number"
                  min={0}
                  className={cn(
                    'mt-1.5 w-full rounded-xl border px-3 py-2.5 font-mono text-[14px]',
                    saveFieldErrors.venueCapacity ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
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
                {saveFieldErrors.venueCapacity ? (
                  <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.venueCapacity}</p>
                ) : null}
              </label>
              <div className="md:col-span-2">
                <p className="text-[12px] font-semibold text-ink-60">{t('fields.facilities')}</p>
                <p className="mt-0.5 text-[11px] text-ink-40">{t('fields.facilitiesHint')}</p>
                <div className="mt-2 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                    placeholder={t('fields.facilitiesPlaceholder')}
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
                    {t('actions.add')}
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
            <h2 className="text-lg font-extrabold text-ink">{t('sections.organization')}</h2>
            <p className="max-w-2xl text-[12px] text-ink-60">{t('organization.socialSaveHint')}</p>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="block text-[12px] font-semibold text-ink-60">
                {t('fields.website')}
                <input
                  className={cn(
                    'mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[14px]',
                    saveFieldErrors.website ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
                  value={p.organization?.website ?? ''}
                  onChange={(e) => patch({ organization: mergeOrganization(p.organization, { website: e.target.value }) })}
                />
                {saveFieldErrors.website ? (
                  <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.website}</p>
                ) : null}
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                {t('fields.instagram')}
                <input
                  className={cn(
                    'mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[14px]',
                    saveFieldErrors.instagram ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
                  value={p.organization?.instagram ?? ''}
                  onChange={(e) => patch({ organization: mergeOrganization(p.organization, { instagram: e.target.value }) })}
                />
                {saveFieldErrors.instagram ? (
                  <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.instagram}</p>
                ) : null}
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                {t('fields.twitter')}
                <input
                  className={cn(
                    'mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[14px]',
                    saveFieldErrors.twitter ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
                  value={p.organization?.twitter ?? ''}
                  onChange={(e) => patch({ organization: mergeOrganization(p.organization, { twitter: e.target.value }) })}
                />
                {saveFieldErrors.twitter ? (
                  <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.twitter}</p>
                ) : null}
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                {t('fields.tiktok')}
                <input
                  className={cn(
                    'mt-1.5 w-full rounded-xl border px-3 py-2.5 text-[14px]',
                    saveFieldErrors.tiktok ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
                  value={p.organization?.tiktok ?? ''}
                  onChange={(e) => patch({ organization: mergeOrganization(p.organization, { tiktok: e.target.value }) })}
                />
                {saveFieldErrors.tiktok ? (
                  <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.tiktok}</p>
                ) : null}
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                {t('fields.typicalDuration')}
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  className={cn(
                    'mt-1.5 w-full rounded-xl border px-3 py-2.5 font-mono text-[14px]',
                    saveFieldErrors.typicalEventDurationHours ? 'border-coral ring-1 ring-coral/30' : 'border-ink-10'
                  )}
                  value={p.organization?.typicalEventDurationHours ?? ''}
                  onChange={(e) =>
                    patch({
                      organization: mergeOrganization(p.organization, {
                        typicalEventDurationHours: e.target.value ? Number(e.target.value) : null,
                      }),
                    })
                  }
                />
                {saveFieldErrors.typicalEventDurationHours ? (
                  <p className="mt-1 text-[12px] font-medium text-coral">{saveFieldErrors.typicalEventDurationHours}</p>
                ) : null}
              </label>
            </div>
          </section>
        ) : null}

        {tab === 'documents' ? (
          <section className="space-y-8 p-6 md:p-8">
            <h2 className="text-lg font-extrabold text-ink">{t('sections.documentsMedia')}</h2>

            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-ink-60">{t('fields.organizationDocument')}</p>
              <p className="text-[11px] text-ink-40">{t('fields.organizationDocumentHint')}</p>
              {docUploadError ? <p className="text-[12px] text-coral">{docUploadError}</p> : null}
              {saveFieldErrors.organizationDocument ? (
                <p className="text-[12px] font-medium text-coral">{saveFieldErrors.organizationDocument}</p>
              ) : null}
              {p.organizationDocument ? (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-10 bg-ink-5/50 px-4 py-3">
                  <FileText className="h-9 w-9 shrink-0 text-coral" strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{displayFileLabel(p.organizationDocument)}</p>
                    <p className="text-[11px] text-ink-40">
                      {/^https?:\/\//i.test(p.organizationDocument) ? t('upload.storedUrl') : t('upload.notUploadedYet')}
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
                    {t('remove', { ns: 'common' })}
                  </button>
                </div>
              ) : null}
              <UploadTileInput
                title={docUploading ? t('uploading', { ns: 'common' }) : t('upload.organizationDocument')}
                subtitle={t('upload.organizationDocumentSubtitle')}
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
                      setDocUploadError(err instanceof Error ? err.message : t('errors.documentUploadFailed'));
                    })
                    .finally(() => setDocUploading(false));
                }}
              />
            </div>

            <div className="space-y-3 border-t border-ink-10 pt-8">
              <p className="text-[12px] font-semibold text-ink-60">{t('fields.galleryImages')}</p>
              <p className="text-[11px] text-ink-40">{t('fields.galleryHint')}</p>
              {galleryUploadError ? <p className="text-[12px] text-coral">{galleryUploadError}</p> : null}
              {saveFieldErrors.gallery ? <p className="text-[12px] font-medium text-coral">{saveFieldErrors.gallery}</p> : null}
              {galleryUploading ? <p className="text-[12px] text-ink-60">{t('errors.uploadingImages')}</p> : null}
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
                      setGalleryUploadError(err instanceof Error ? err.message : t('errors.galleryUploadFailed'));
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
            {t('actions.saveProfile')}
          </Button>
          {saved ? <span className="text-[13px] font-semibold text-mint-dark">{t('saved', { ns: 'common' })}</span> : null}
        </div>
      </form>
    </div>
  );
}
