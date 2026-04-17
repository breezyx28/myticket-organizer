import { Button } from '@/components/ui/Button';
import { GalleryDropZone } from '@/components/ui/GalleryDropZone';
import { SaudiPhoneInput } from '@/components/ui/SaudiPhoneInput';
import { UploadTileInput } from '@/components/ui/UploadTileInput';
import { getProfile, isProfileComplete, updateProfile } from '@/services/profileService';
import type { OrganizerUser } from '@/types/domain';
import { findRegionIdForCityName, getCitiesForRegion, SAUDI_REGIONS } from '@/lib/saudiLocations';
import { Briefcase, Building2, FileText, FolderOpen, ImageIcon, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ProfileTab = 'info' | 'venue' | 'organization' | 'documents';

function displayFileLabel(value: string) {
  const galleryNamed = value.match(/^file:(.+):[a-z0-9]+$/i);
  if (galleryNamed) return galleryNamed[1].replace(/_/g, ' ');
  return value.replace(/^(file|upload|document|image):/i, '').trim() || value;
}

function isRemoteMediaUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith('data:');
}

function nextGalleryKey(file: File) {
  return `file:${file.name.replace(/\s+/g, '_')}:${Date.now().toString(36)}`;
}

export function ProfilePage() {
  const [p, setP] = useState<OrganizerUser | null>(null);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('info');
  const [profileRegionId, setProfileRegionId] = useState('');
  const [venueRegionId, setVenueRegionId] = useState('');
  const [previousEventInput, setPreviousEventInput] = useState('');
  const [facilityInput, setFacilityInput] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
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
      void getProfile().then(setP);
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
      setProfileRegionId(findRegionIdForCityName(p.city));
      const vCity = p.venue?.city ?? p.city;
      setVenueRegionId(findRegionIdForCityName(vCity));
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

  const profileCities = useMemo(() => getCitiesForRegion(profileRegionId), [profileRegionId]);
  const venueCities = useMemo(() => getCitiesForRegion(venueRegionId), [venueRegionId]);

  const galleryItems = useMemo(() => {
    if (!p) return [];
    return (p.gallery ?? []).map((key) => ({
      key,
      label: displayFileLabel(key),
      previewUrl: galleryPreviewByKey[key] ?? (isRemoteMediaUrl(key) ? key : undefined),
    }));
  }, [p, galleryPreviewByKey]);

  if (!p) return <div className="py-20 text-center text-ink-60">Loading…</div>;

  const ok = isProfileComplete(p);

  const logoDisplaySrc =
    logoPreviewUrl ?? (p.logoUrl && (isRemoteMediaUrl(p.logoUrl) || p.logoUrl.startsWith('blob:')) ? p.logoUrl : null);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Account</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Organizer profile</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-60">
          Complete your profile before creating events. Organized by tabs; uploads are demo-only (filenames + local previews).
        </p>
      </div>

      {!ok ? (
        <div className="rounded-3xl border border-coral/40 bg-coral/10 px-5 py-4 text-[14px] text-ink">
          <strong>Incomplete.</strong> Add organization document, at least one gallery image, venue capacity &amp; facilities, and
          basic organizer details.
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
        className="space-y-0 overflow-hidden rounded-3xl border border-ink-10 bg-white shadow-card-sm"
        onSubmit={(e) => {
          e.preventDefault();
          updateProfile(p);
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
                    patch({ city: '' });
                  }}
                >
                  <option value="">Select region</option>
                  {SAUDI_REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                City
                <select
                  className="mt-1.5 w-full rounded-xl border border-ink-10 bg-white px-3 py-2.5 text-[14px]"
                  value={p.city}
                  onChange={(e) => patch({ city: e.target.value })}
                  disabled={!profileRegionId}
                >
                  <option value="">{profileRegionId ? 'Select city' : 'Choose a region first'}</option>
                  {profileCities.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2">
                <p className="text-[12px] font-semibold text-ink-60">Logo</p>
                <p className="mt-0.5 text-[11px] text-ink-40">Upload a square image (PNG or JPG). Shown on invoices and listings (demo).</p>
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
                      subtitle="PNG or JPG, max a few MB in production"
                      accept="image/png,image/jpeg,image/webp"
                      onPick={(file) => {
                        revokePreview(logoPreviewUrl ?? undefined);
                        const url = trackPreview(URL.createObjectURL(file));
                        setLogoPreviewUrl(url);
                        patch({ logoUrl: `file:${file.name}` });
                      }}
                    />
                    {(p.logoUrl || logoPreviewUrl) && (
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-60">
                        <span className="truncate font-mono text-[11px]">{displayFileLabel(p.logoUrl || 'upload')}</span>
                        <button
                          type="button"
                          className="font-semibold text-coral hover:underline"
                          onClick={() => {
                            revokePreview(logoPreviewUrl ?? undefined);
                            setLogoPreviewUrl(null);
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
                      },
                    });
                  }}
                >
                  <option value="">Select region</option>
                  {SAUDI_REGIONS.map((r) => (
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
                  value={p.venue?.city ?? ''}
                  onChange={(e) =>
                    patch({
                      venue: { ...(p.venue ?? { name: p.displayName, capacity: null, facilities: [], address: '' }), city: e.target.value },
                    })
                  }
                  disabled={!venueRegionId}
                >
                  <option value="">{venueRegionId ? 'Select city' : 'Choose a region first'}</option>
                  {venueCities.map((c) => (
                    <option key={c.id} value={c.name}>
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
            <div className="grid gap-6 md:grid-cols-2">
              <label className="block text-[12px] font-semibold text-ink-60">
                Website
                <input
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                  value={p.organization?.website ?? ''}
                  onChange={(e) => patch({ organization: { ...(p.organization ?? { previousEvents: [], categories: [] }), website: e.target.value } })}
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                Instagram
                <input
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                  value={p.organization?.instagram ?? ''}
                  onChange={(e) => patch({ organization: { ...(p.organization ?? { previousEvents: [], categories: [] }), instagram: e.target.value } })}
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                Twitter / X
                <input
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                  value={p.organization?.twitter ?? ''}
                  onChange={(e) => patch({ organization: { ...(p.organization ?? { previousEvents: [], categories: [] }), twitter: e.target.value } })}
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                TikTok
                <input
                  className="mt-1.5 w-full rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                  value={p.organization?.tiktok ?? ''}
                  onChange={(e) => patch({ organization: { ...(p.organization ?? { previousEvents: [], categories: [] }), tiktok: e.target.value } })}
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
                      organization: {
                        ...(p.organization ?? { previousEvents: [], categories: [] }),
                        typicalEventDurationHours: e.target.value ? Number(e.target.value) : null,
                      },
                    })
                  }
                />
              </label>
              <div className="md:col-span-2">
                <p className="text-[12px] font-semibold text-ink-60">Previous events</p>
                <p className="mt-0.5 text-[11px] text-ink-40">Add each event name and press Enter — like a tag list.</p>
                <div className="mt-2 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-xl border border-ink-10 px-3 py-2.5 text-[14px]"
                    placeholder="e.g. Neon Skyline — Spring"
                    value={previousEventInput}
                    onChange={(e) => setPreviousEventInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const v = previousEventInput.trim();
                      if (!v) return;
                      const list = p.organization?.previousEvents ?? [];
                      if (list.some((x) => x.toLowerCase() === v.toLowerCase())) {
                        setPreviousEventInput('');
                        return;
                      }
                      patch({
                        organization: { ...(p.organization ?? { categories: [] }), previousEvents: [...list, v] },
                      });
                      setPreviousEventInput('');
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      const v = previousEventInput.trim();
                      if (!v) return;
                      const list = p.organization?.previousEvents ?? [];
                      if (list.some((x) => x.toLowerCase() === v.toLowerCase())) return;
                      patch({
                        organization: { ...(p.organization ?? { categories: [] }), previousEvents: [...list, v] },
                      });
                      setPreviousEventInput('');
                    }}
                  >
                    Add
                  </Button>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {(p.organization?.previousEvents ?? []).map((ev) => (
                    <li
                      key={ev}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink-5 px-3 py-1.5 text-[12px] font-semibold text-ink ring-1 ring-ink-10"
                    >
                      {ev}
                      <button
                        type="button"
                        className="text-coral hover:underline"
                        onClick={() =>
                          patch({
                            organization: {
                              ...(p.organization ?? { categories: [] }),
                              previousEvents: (p.organization?.previousEvents ?? []).filter((x) => x !== ev),
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

        {tab === 'documents' ? (
          <section className="space-y-8 p-6 md:p-8">
            <h2 className="text-lg font-extrabold text-ink">Documents &amp; media</h2>

            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-ink-60">Organization document (required)</p>
              <p className="text-[11px] text-ink-40">PDF or image — demo stores a filename reference.</p>
              {p.organizationDocument ? (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-10 bg-ink-5/50 px-4 py-3">
                  <FileText className="h-9 w-9 shrink-0 text-coral" strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{displayFileLabel(p.organizationDocument)}</p>
                    <p className="text-[11px] text-ink-40">Uploaded file (demo)</p>
                  </div>
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-coral hover:underline"
                    onClick={() => patch({ organizationDocument: '' })}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              <UploadTileInput
                title="Upload organization document"
                subtitle="PDF, scan, or photo of CR / permit"
                accept="image/*,.pdf,application/pdf"
                onPick={(file) => patch({ organizationDocument: `document:${file.name}` })}
              />
            </div>

            <div className="space-y-3 border-t border-ink-10 pt-8">
              <p className="text-[12px] font-semibold text-ink-60">Gallery images</p>
              <p className="text-[11px] text-ink-40">Drag and drop or pick multiple images. Thumbnails are shown for this session.</p>
              <GalleryDropZone
                items={galleryItems}
                onAddFiles={(files) => {
                  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
                  if (!imageFiles.length) return;
                  const additions: Record<string, string> = {};
                  const newKeys: string[] = [];
                  for (const f of imageFiles) {
                    const key = nextGalleryKey(f);
                    newKeys.push(key);
                    additions[key] = trackPreview(URL.createObjectURL(f));
                  }
                  setGalleryPreviewByKey((prev) => ({ ...prev, ...additions }));
                  setP((cur) => (cur ? { ...cur, gallery: [...(cur.gallery ?? []), ...newKeys] } : cur));
                }}
                onRemove={(key) => {
                  setGalleryPreviewByKey((prev) => {
                    const url = prev[key];
                    revokePreview(url);
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
          {saved ? <span className="text-[13px] font-semibold text-mint-dark">Saved (local)</span> : null}
        </div>
      </form>
    </div>
  );
}
