import { CancellationFlow } from '@/components/events/CancellationFlow';
import { VenueLocationMap } from '@/components/maps/VenueLocationMap';
import { PublishImpactDialog } from '@/components/events/PublishImpactDialog';
import { RecurrenceManager } from '@/components/events/RecurrenceManager';
import { SeatLayoutBuilder } from '@/components/events/SeatLayoutBuilder';
import { Button } from '@/components/ui/Button';
import { ApiBaseUrl } from '@/config/api';
import { fromLocalInput, toLocalInput } from '@/lib/datetimeLocal';
import { toast } from '@/lib/appToast';
import { useEventStatusLabel } from '@/lib/eventStatusLabels';
import { type EventEditorTabId, usePersistedEventEditorTab } from '@/hooks/usePersistedEventEditorTab';
import { useEventEditorSync } from '@/hooks/useEventEditorSync';
import {
  appendChangeLog,
  archiveEvent,
  buildSeatsFromGrid,
  cancelOccurrence,
  createDraftEvent,
  createEventTicketTypeApi,
  defaultNewEventSchedule,
  formatOrganizerApiError,
  deleteEventGalleryItemApi,
  deleteEventTicketTypeApi,
  diffOrganizerEventPatch,
  isServerNumericTicketTypeId,
  listEventNotifications,
  publishEvent,
  simulateLifecycleTick,
  updateEventTicketTypeApi,
  uploadEventCoverImageWithProgress,
  uploadEventGalleryImageApi,
  validateFreeLayoutTotals,
} from '@/services/eventsService';
import { getProfile, isProfileComplete } from '@/services/profileService';
import { useListEventCategoriesQuery, useListSaudiCitiesQuery, useListSaudiRegionsQuery } from '@/store/api/referenceApi';
import type { EntryMode, LayoutType, OrganizerEvent } from '@/types/domain';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EventPartnersTab } from '@/components/events/EventPartnersTab';
import { Armchair, FileText, Handshake, Image, LayoutGrid, MoreHorizontal, RefreshCcw, Ticket } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { pickLocalizedRefName } from '@/lib/locale/localizedRefName';
import { formatDateTime } from '@/lib/locale/format';
import { postEventMediaKindLabel } from '@/lib/events/mediaLabels';
import { tError } from '@/lib/i18n/translateError';

function toastApiErr(err: unknown, fallback: string) {
  const msg = formatOrganizerApiError(err).trim();
  const requestFailed = tError('api.requestFailed');
  toast.error(msg && msg !== requestFailed ? msg : fallback);
}

export function EventEditorPage() {
  const { t } = useTranslation(['events', 'common']);
  const { language } = useLocale();
  const { id } = useParams();
  const navigate = useNavigate();
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newScheduleLocal, setNewScheduleLocal] = useState(() => {
    const { startsAt, endsAt } = defaultNewEventSchedule();
    return { startsLocal: toLocalInput(startsAt), endsLocal: toLocalInput(endsAt) };
  });
  const [newFormErrors, setNewFormErrors] = useState<{ title?: string; startsLocal?: string; endsLocal?: string; form?: string }>({});
  const [profileOk, setProfileOk] = useState(true);
  const [impactOpen, setImpactOpen] = useState(false);
  const [pendingPatch, setPendingPatch] = useState<Partial<OrganizerEvent> | null>(null);
  const [impactChanges, setImpactChanges] = useState<{ field: string; old: string; new: string }[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [mediaLabel, setMediaLabel] = useState('');
  const [newTicketTypeLabel, setNewTicketTypeLabel] = useState('');
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [galleryUploadError, setGalleryUploadError] = useState<string | null>(null);
  const [uploadedCoverPreview, setUploadedCoverPreview] = useState<string | null>(null);

  const mapCoordsSaveTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const {
    event,
    loading,
    committed,
    latestEventRef,
    updateLocal,
    saveWithToast,
    reloadFromServer,
    refreshTicketTypes,
    concurrentTabWarning,
    dismissConcurrentTabWarning,
  } = useEventEditorSync(id);
  const { activeTab, setActiveTab } = usePersistedEventEditorTab(id);

  function clampSeatMapDimension(value: number, max: number) {
    if (!Number.isFinite(value) || value < 1) return 1;
    return Math.min(max, Math.trunc(value));
  }

  const { data: eventCategories = [] } = useListEventCategoriesQuery();
  const { data: saudiRegions = [] } = useListSaudiRegionsQuery();
  const regionIdForCities = (event?.regionId ?? '').trim();
  const { data: saudiCities = [] } = useListSaudiCitiesQuery(regionIdForCities);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void (async () => {
        const p = await getProfile();
        setProfileOk(isProfileComplete(p));
      })();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    return () => {
      if (uploadedCoverPreview) URL.revokeObjectURL(uploadedCoverPreview);
    };
  }, [uploadedCoverPreview]);

  useEffect(() => {
    return () => {
      if (mapCoordsSaveTimerRef.current) window.clearTimeout(mapCoordsSaveTimerRef.current);
    };
  }, []);

  const statusLabel = useEventStatusLabel(event?.status ?? 'draft');

  const statusLine = useMemo(() => {
    if (!event) return '';
    const entryModeLabel = t(`entryMode.${event.entryMode as EntryMode}`);
    return t('editor.statusLine', { status: statusLabel, sold: event.ticketsSold, entryMode: entryModeLabel });
  }, [event, statusLabel, t]);

  function mapCreateServerErrors(message: string) {
    const m = message.toLowerCase();
    const fieldErrors: { title?: string; startsLocal?: string; endsLocal?: string; form?: string } = {};
    if (m.includes('title')) fieldErrors.title = message;
    if (m.includes('starts_at') || m.includes('start')) fieldErrors.startsLocal = message;
    if (m.includes('ends_at') || m.includes('end')) fieldErrors.endsLocal = message;
    if (!fieldErrors.title && !fieldErrors.startsLocal && !fieldErrors.endsLocal) {
      fieldErrors.form = message;
    }
    return fieldErrors;
  }

  if (!profileOk) {
    return <Navigate to="/profile" replace />;
  }

  if (id === 'new') {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-10 px-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">{t('editor.new.eyebrow')}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{t('editor.new.title')}</h1>
          <p className="mt-2 text-[13px] text-ink-60">{t('editor.new.description')}</p>
        </div>
        <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <div className="grid gap-4">
            <Field label={t('editor.new.titleField')}>
              <input
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-[14px] ${newFormErrors.title ? 'border-coral' : 'border-ink-10'}`}
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  setNewFormErrors((cur) => ({ ...cur, title: undefined, form: undefined }));
                }}
                placeholder={t('editor.new.titlePlaceholder')}
                autoFocus
              />
              {newFormErrors.title ? <p className="mt-1 text-[12px] text-coral">{newFormErrors.title}</p> : null}
            </Field>
            <Field label={t('editor.new.starts')}>
              <input
                type="datetime-local"
                className={`mt-1 w-full rounded-xl border px-3 py-2 font-mono text-[13px] ${
                  newFormErrors.startsLocal ? 'border-coral' : 'border-ink-10'
                }`}
                value={newScheduleLocal.startsLocal}
                onChange={(e) => {
                  setNewScheduleLocal((s) => ({ ...s, startsLocal: e.target.value }));
                  setNewFormErrors((cur) => ({ ...cur, startsLocal: undefined, form: undefined }));
                }}
              />
              {newFormErrors.startsLocal ? <p className="mt-1 text-[12px] text-coral">{newFormErrors.startsLocal}</p> : null}
            </Field>
            <Field label={t('editor.new.ends')}>
              <input
                type="datetime-local"
                className={`mt-1 w-full rounded-xl border px-3 py-2 font-mono text-[13px] ${
                  newFormErrors.endsLocal ? 'border-coral' : 'border-ink-10'
                }`}
                value={newScheduleLocal.endsLocal}
                onChange={(e) => {
                  setNewScheduleLocal((s) => ({ ...s, endsLocal: e.target.value }));
                  setNewFormErrors((cur) => ({ ...cur, endsLocal: undefined, form: undefined }));
                }}
              />
              {newFormErrors.endsLocal ? <p className="mt-1 text-[12px] text-coral">{newFormErrors.endsLocal}</p> : null}
              {newFormErrors.form ? <p className="mt-1 text-[12px] text-coral">{newFormErrors.form}</p> : null}
            </Field>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/events">
              <Button variant="outline" size="md" type="button">
                {t('back', { ns: 'common' })}
              </Button>
            </Link>
            <Button
              variant="dark"
              size="md"
              type="button"
              disabled={creatingEvent}
              onClick={() => {
                void (async () => {
                  const nextErrors: { title?: string; startsLocal?: string; endsLocal?: string; form?: string } = {};
                  const title = newTitle.trim();
                  if (!title) nextErrors.title = t('editor.validation.titleRequired');
                  if (!newScheduleLocal.startsLocal) nextErrors.startsLocal = t('editor.validation.startsRequired');
                  if (!newScheduleLocal.endsLocal) nextErrors.endsLocal = t('editor.validation.endsRequired');
                  if (Object.keys(nextErrors).length > 0) {
                    setNewFormErrors(nextErrors);
                    return;
                  }
                  const startsAt = fromLocalInput(newScheduleLocal.startsLocal);
                  const endsAt = fromLocalInput(newScheduleLocal.endsLocal);
                  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
                    setNewFormErrors({ endsLocal: t('editor.validation.endsAfterStarts') });
                    return;
                  }
                  setNewFormErrors({});
                  setCreatingEvent(true);
                  try {
                    const ev = await createDraftEvent({ title, startsAt, endsAt });
                    navigate(`/events/${ev.id}`, { replace: true });
                  } catch (e) {
                    const msg = formatOrganizerApiError(e);
                    setNewFormErrors(mapCreateServerErrors(msg));
                  } finally {
                    setCreatingEvent(false);
                  }
                })();
              }}
            >
              {creatingEvent ? t('creating', { ns: 'common' }) : t('editor.new.createDraft')}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (loading || !event) {
    return <div className="py-20 text-center text-[14px] text-ink-60">{t('loading', { ns: 'common' })}</div>;
  }

  const freeValidation = validateFreeLayoutTotals(event);
  const notifications = listEventNotifications().filter((n) => n.eventId === event.id);
  const coverImageUrl = uploadedCoverPreview || (event.eventGallery?.length ? resolvePublicUrl(event.eventGallery[0].url) : '');
  const showPostEventMedia = event.status === 'archived' || event.status === 'ended';
  const moreHasContent = showPostEventMedia || notifications.length > 0;

  const editorTabs: { id: EventEditorTabId; label: string; Icon: typeof FileText }[] = [
    { id: 'basics', label: t('editor.tabs.basics'), Icon: FileText },
    { id: 'media', label: t('editor.tabs.media'), Icon: Image },
    { id: 'layout', label: t('editor.tabs.layout'), Icon: LayoutGrid },
    { id: 'seats', label: t('editor.tabs.seats'), Icon: Armchair },
    { id: 'tickets', label: t('editor.tabs.tickets'), Icon: Ticket },
    { id: 'partners', label: t('editor.tabs.partners'), Icon: Handshake },
    { id: 'more', label: t('editor.tabs.more'), Icon: MoreHorizontal },
  ];

  function partialChanges(prev: OrganizerEvent, patch: Partial<OrganizerEvent>) {
    const out: { field: string; old: string; new: string }[] = [];
    for (const k of Object.keys(patch) as (keyof OrganizerEvent)[]) {
      if (k === 'seats' || k === 'occurrences' || k === 'lastChangeLog' || k === 'postEventMedia' || k === 'eventGallery' || k === 'ticketTypes')
        continue;
      const before = prev[k];
      const after = patch[k];
      if (after === undefined) continue;
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        out.push({ field: String(k), old: String(before ?? ''), new: String(after ?? '') });
      }
    }
    return out;
  }

  function uploadCoverFile(file: File) {
    if (!event) return;
    const eventId = event.id;
    void (async () => {
      setCoverBusy(true);
      setCoverProgress(0);
      setCoverUploadError(null);
      try {
        await uploadEventCoverImageWithProgress(eventId, file, (p) => setCoverProgress(p));
        if (uploadedCoverPreview) URL.revokeObjectURL(uploadedCoverPreview);
        setUploadedCoverPreview(URL.createObjectURL(file));
        await reloadFromServer();
      } catch (err) {
        setCoverUploadError(err instanceof Error ? err.message : t('editor.toasts.coverUploadFailed'));
      } finally {
        setCoverBusy(false);
      }
    })();
  }

  function saveEventPatch(patch: Partial<OrganizerEvent>, options?: { localSnapshot?: OrganizerEvent }) {
    if (!committed.current) return;
    const base = committed.current;
    const sold =
      base.ticketsSold > 0 &&
      (base.status === 'published' ||
        base.status === 'pending_approval' ||
        base.status === 'sold_out' ||
        base.status === 'in_progress');
    if (sold) {
      const changes = partialChanges(base, patch);
      if (changes.length > 0) {
        setPendingPatch(patch);
        setImpactChanges(changes);
        setImpactOpen(true);
        return;
      }
    }
    saveWithToast(patch, options, (err) => {
      toastApiErr(err, t('editor.toasts.saveFailed'));
    });
  }

  function confirmImpactSave() {
    if (!pendingPatch || !committed.current) return;
    const base = committed.current;
    const localBeforeSave = event ? (JSON.parse(JSON.stringify(event)) as OrganizerEvent) : base;
    const changes = partialChanges(base, pendingPatch);
    saveWithToast(
      pendingPatch,
      { localSnapshot: localBeforeSave },
      (err) => {
        toastApiErr(err, t('editor.toasts.saveFailed'));
        setImpactOpen(false);
        setPendingPatch(null);
      },
      () => {
        void appendChangeLog(base.id, changes);
        setImpactOpen(false);
        setPendingPatch(null);
      }
    );
  }

  function handleSaveChanges() {
    if (!committed.current || !event) return;
    const diff = diffOrganizerEventPatch(committed.current, event);
    if (Object.keys(diff).length === 0) return;
    const base = committed.current;
    const sold =
      base.ticketsSold > 0 &&
      (base.status === 'published' ||
        base.status === 'pending_approval' ||
        base.status === 'sold_out' ||
        base.status === 'in_progress');
    if (sold) {
      const changes = partialChanges(base, diff);
      if (changes.length > 0) {
        setPendingPatch(diff);
        setImpactChanges(changes);
        setImpactOpen(true);
        return;
      }
    }
    saveEventPatch(diff, { localSnapshot: event });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">{t('editor.eyebrow')}</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{event.title}</h1>
          <p className="mt-2 text-[13px] text-ink-60">{statusLine}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/events">
            <Button variant="outline" size="md">
              {t('back', { ns: 'common' })}
            </Button>
          </Link>
          <Button variant="dark" size="md" type="button" onClick={() => void handleSaveChanges()}>
            {t('save', { ns: 'common' })}
          </Button>
          {event.status === 'draft' || event.status === 'rejected' ? (
            <Button
              variant="dark"
              size="md"
              onClick={() => {
                void (async () => {
                  try {
                    await publishEvent(event.id);
                    await reloadFromServer();
                  } catch (err) {
                    toastApiErr(err, t('editor.toasts.submitFailed'));
                  }
                })();
              }}
            >
              {t('editor.submitForReview')}
            </Button>
          ) : null}
          {event.status === 'ended' ? (
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                void (async () => {
                  try {
                    await archiveEvent(event.id);
                    await reloadFromServer();
                  } catch (err) {
                    toastApiErr(err, t('editor.toasts.archiveFailed'));
                  }
                })();
              }}
            >
              {t('list.actions.archive')}
            </Button>
          ) : null}
          {event.status !== 'cancelled' && event.status !== 'archived' ? (
            <Button variant="danger" size="md" onClick={() => setCancelOpen(true)}>
              {t('list.actions.cancelTitle')}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="md"
            title={t('editor.nextLifecycleTitle')}
            onClick={() => {
              void (async () => {
                try {
                  await simulateLifecycleTick(event.id);
                  await reloadFromServer();
                } catch (err) {
                  toastApiErr(err, t('editor.toasts.lifecycleFailed'));
                }
              })();
            }}
          >
            {t('editor.nextLifecycle')}
          </Button>
        </div>
      </div>
      <section className="rounded-2xl border border-ink-10 bg-ink-5/40 p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-ink-60">{t('editor.lifecycle.title')}</p>
            <p className="mt-1 text-[13px] text-ink-80">
              <strong>{statusLabel}</strong>
              <span className="text-ink-60">
                {' '}
                {t('editor.lifecycle.bodyIntro')} <strong>{t('editor.lifecycle.pendingApproval')}</strong>
                {t('editor.lifecycle.bodyOutro')}
              </span>
            </p>
          </div>
          <Link to={`/scanners?eventId=${encodeURIComponent(event.id)}`} className="shrink-0 text-[12px] font-semibold text-coral hover:underline">
            {t('editor.lifecycle.assignScanners')}
          </Link>
        </div>
      </section>

      {concurrentTabWarning ? (
        <section className="rounded-2xl border border-coral/30 bg-coral/10 p-4">
          <p className="text-[13px] font-semibold text-ink">{t('editor.concurrentTab.title')}</p>
          <p className="mt-1 text-[12px] text-ink-60">{t('editor.concurrentTab.body')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white"
              onClick={() => {
                dismissConcurrentTabWarning();
                void reloadFromServer();
              }}
            >
              {t('editor.concurrentTab.reload')}
            </button>
            <button
              type="button"
              className="rounded-full border border-ink-10 bg-white px-4 py-2 text-[12px] font-semibold text-ink-60 hover:bg-ink-5"
              onClick={dismissConcurrentTabWarning}
            >
              {t('editor.concurrentTab.dismiss')}
            </button>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {editorTabs.map(({ id: tabId, label, Icon }) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setActiveTab(tabId)}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-center text-[11px] font-bold leading-tight sm:flex-row sm:gap-2 sm:px-3 sm:text-[12px] ${
              activeTab === tabId ? 'bg-ink text-white shadow-card-sm' : 'bg-ink-5 text-ink-60 ring-1 ring-ink-10 hover:bg-ink-5/80'
            }`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'basics' ? (
      <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold text-ink">{t('editor.tabs.basics')}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label={t('editor.fields.title')}>
            <input
              className="mt-1 w-full rounded-xl border border-ink-10 px-3 py-2 text-[14px]"
              value={event.title}
              onChange={(e) => updateLocal((cur) => ({ ...cur, title: e.target.value }))}
              onBlur={(e) => saveEventPatch({ title: e.target.value })}
            />
          </Field>
          <Field label={t('editor.fields.category')}>
            <select
              className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 text-[14px]"
              value={event.categoryId ?? ''}
              onChange={(e) => {
                const cid = e.target.value;
                const opt = eventCategories.find((c) => c.id === cid);
                const label = opt ? pickLocalizedRefName(opt, language) : '';
                const categoryEn = opt?.nameEn ?? opt?.name ?? '';
                updateLocal((cur) => ({
                  ...cur,
                  categoryId: cid || undefined,
                  category: categoryEn || label || cur.category,
                }));
                saveEventPatch({ categoryId: cid || undefined, category: categoryEn || label });
              }}
            >
              <option value="">{t('editor.placeholders.selectCategory')}</option>
              {eventCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {pickLocalizedRefName(c, language)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('editor.fields.venue')} className="md:col-span-2">
            <input
              className="mt-1 w-full rounded-xl border border-ink-10 px-3 py-2 text-[14px]"
              value={event.venue}
              onChange={(e) => updateLocal((cur) => ({ ...cur, venue: e.target.value }))}
              onBlur={(e) => saveEventPatch({ venue: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <VenueLocationMap
              visible={activeTab === 'basics'}
              latitude={event.latitude ?? null}
              longitude={event.longitude ?? null}
              hint={t('editor.placeholders.locationAutoSave')}
              onCoordinatesChange={(lat, lng) => {
                updateLocal((cur) => ({ ...cur, latitude: lat, longitude: lng }));
                if (mapCoordsSaveTimerRef.current) window.clearTimeout(mapCoordsSaveTimerRef.current);
                mapCoordsSaveTimerRef.current = window.setTimeout(() => {
                  mapCoordsSaveTimerRef.current = null;
                  saveEventPatch({ latitude: lat, longitude: lng });
                }, 400);
              }}
            />
          </div>
          <Field label={t('editor.fields.region')}>
            <select
              className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 text-[14px]"
              value={event.regionId ?? ''}
              onChange={(e) => {
                const rid = e.target.value;
                updateLocal((cur) => ({ ...cur, regionId: rid || undefined, cityId: undefined, city: '' }));
                saveEventPatch({ regionId: rid || undefined, cityId: undefined, city: '' });
              }}
            >
              <option value="">{t('editor.placeholders.selectRegion')}</option>
              {saudiRegions.map((r) => (
                <option key={r.id} value={r.id}>
                  {pickLocalizedRefName(r, language)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('editor.fields.city')}>
            <select
              className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 text-[14px] disabled:opacity-50"
              disabled={!regionIdForCities}
              value={event.cityId ?? ''}
              onChange={(e) => {
                const cid = e.target.value;
                const opt = saudiCities.find((c) => c.id === cid);
                const cityLabel = opt ? pickLocalizedRefName(opt, language) : '';
                updateLocal((cur) => ({ ...cur, cityId: cid || undefined, city: cityLabel || cur.city }));
                saveEventPatch({ cityId: cid || undefined, city: cityLabel });
              }}
            >
              <option value="">{regionIdForCities ? t('editor.placeholders.selectCity') : t('editor.placeholders.chooseRegionFirst')}</option>
              {saudiCities.map((c) => (
                <option key={c.id} value={c.id}>
                  {pickLocalizedRefName(c, language)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('editor.fields.starts')}>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-ink-10 px-3 py-2 font-mono text-[13px]"
              value={toLocalInput(event.startsAt)}
              onChange={(e) => {
                const iso = fromLocalInput(e.target.value);
                if (iso) updateLocal((cur) => ({ ...cur, startsAt: iso }));
              }}
              onBlur={(e) => {
                const iso = fromLocalInput(e.target.value);
                if (iso) saveEventPatch({ startsAt: iso });
              }}
            />
          </Field>
          <Field label={t('editor.fields.ends')}>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-ink-10 px-3 py-2 font-mono text-[13px]"
              value={toLocalInput(event.endsAt)}
              onChange={(e) => {
                const iso = fromLocalInput(e.target.value);
                if (iso) updateLocal((cur) => ({ ...cur, endsAt: iso }));
              }}
              onBlur={(e) => {
                const iso = fromLocalInput(e.target.value);
                if (iso) saveEventPatch({ endsAt: iso });
              }}
            />
          </Field>
          <Field label={t('editor.fields.description')} className="md:col-span-2">
            <textarea
              rows={4}
              className="mt-1 w-full rounded-xl border border-ink-10 px-3 py-2 text-[14px]"
              value={event.description}
              onChange={(e) => updateLocal((cur) => ({ ...cur, description: e.target.value }))}
              onBlur={(e) => saveEventPatch({ description: e.target.value })}
            />
          </Field>
        </div>
      </section>
      ) : null}

      {activeTab === 'media' ? (
      <section className="rounded-3xl border border-ink-10 bg-ink-5/40 p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold text-ink">{t('editor.tabs.media')}</h2>
        <p className="mt-2 max-w-2xl text-[13px] text-ink-60">{t('editor.media.uploadHint')}</p>
        <Field label={t('editor.fields.coverImage')}>
          <label className="mt-1 inline-flex cursor-pointer flex-wrap items-center gap-2">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              disabled={coverBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                uploadCoverFile(file);
              }}
            />
            <span className="rounded-xl border border-ink-10 bg-white px-4 py-2 text-[13px] font-semibold text-ink shadow-card-sm">
              {coverBusy ? t('editor.upload.coverUploading') : t('editor.upload.cover')}
            </span>
          </label>
          {coverUploadError ? <p className="mt-1 text-[12px] text-coral">{coverUploadError}</p> : null}
          {coverBusy ? (
            <div className="mt-2 w-full max-w-sm">
              <div className="h-2 overflow-hidden rounded-full bg-ink-10">
                <div className="h-full bg-coral transition-all" style={{ width: `${coverProgress}%` }} />
              </div>
              <p className="mt-1 text-[12px] text-ink-60">{t('editor.media.coverProgress', { percent: coverProgress })}</p>
            </div>
          ) : null}
        </Field>
        {coverImageUrl ? (
          <div className="mt-3 w-[220px] overflow-hidden rounded-xl border border-ink-10 bg-white">
            <div className="group relative">
              <img src={coverImageUrl} alt="" className="h-36 w-full object-cover" />
              <button
                type="button"
                className="absolute end-2 top-2 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-white opacity-90 transition hover:bg-ink"
                onClick={() => coverInputRef.current?.click()}
                title={t('editor.media.replaceCoverTitle')}
                disabled={coverBusy}
              >
                <RefreshCcw size={12} />
                {t('editor.media.replace')}
              </button>
            </div>
            <p className="px-3 py-2 text-[11px] text-ink-60">{t('editor.media.currentCover')}</p>
          </div>
        ) : null}
        <label className="mt-4 inline-flex cursor-pointer flex-wrap items-center gap-2">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="sr-only"
            disabled={galleryBusy}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              if (!files.length) return;
              void (async () => {
                setGalleryBusy(true);
                setGalleryUploadError(null);
                try {
                  for (const file of files) {
                    await uploadEventGalleryImageApi(event.id, file);
                  }
                  await reloadFromServer();
                } catch (err) {
                  setGalleryUploadError(err instanceof Error ? err.message : t('editor.toasts.galleryUploadFailed'));
                  await reloadFromServer();
                } finally {
                  setGalleryBusy(false);
                }
              })();
            }}
          />
          <span className="rounded-xl border border-ink-10 bg-white px-4 py-2 text-[13px] font-semibold text-ink shadow-card-sm">
            {galleryBusy ? t('editor.upload.galleryUploading') : t('editor.upload.galleryAdd')}
          </span>
        </label>
        {galleryUploadError ? <p className="mt-1 text-[12px] text-coral">{galleryUploadError}</p> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          {(event.eventGallery ?? []).map((g) => (
            <div key={g.id} className="group relative w-[148px] overflow-hidden rounded-xl border border-ink-10 bg-white">
              <img src={resolvePublicUrl(g.url)} alt="" className="h-28 w-full object-cover" />
              <button
                type="button"
                className="absolute end-2 top-2 rounded-full bg-ink/75 px-2 py-0.5 text-[10px] font-bold uppercase text-white opacity-0 transition group-hover:opacity-100"
                onClick={() => {
                  void (async () => {
                    try {
                      await deleteEventGalleryItemApi(event.id, g.id);
                      await reloadFromServer();
                    } catch (err) {
                      toastApiErr(err, t('editor.toasts.imageRemoveFailed'));
                    }
                  })();
                }}
              >
                {t('remove', { ns: 'common' })}
              </button>
            </div>
          ))}
        </div>
      </section>
      ) : null}

      {activeTab === 'layout' ? (
      <section className="rounded-3xl border border-ink-10 bg-surface-tint p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold text-ink">{t('editor.tabs.layout')}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label={t('editor.fields.layoutType')}>
            <select
              className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 text-[14px]"
              value={event.layoutType}
              onChange={(e) => {
                if (!event) return;
                const layoutType = e.target.value as LayoutType;
                const next: OrganizerEvent = { ...event, layoutType };
                if (layoutType === 'free') {
                  next.seats = [];
                } else {
                  next.rows = next.rows || 6;
                  next.cols = next.cols || 10;
                  next.seats = buildSeatsFromGrid({
                    ...next,
                    rows: next.rows,
                    cols: next.cols,
                    ticketTypes: next.ticketTypes,
                  });
                }
                updateLocal(() => next);
                saveEventPatch(
                  {
                    layoutType: next.layoutType,
                    rows: next.layoutType === 'free' ? 0 : next.rows,
                    cols: next.layoutType === 'free' ? 0 : next.cols,
                  },
                  { localSnapshot: next }
                );
              }}
            >
              <option value="grid">{t('layout.grid')}</option>
              <option value="section">{t('layout.section')}</option>
              <option value="free">{t('layout.free')}</option>
            </select>
          </Field>
          <Field label={t('editor.fields.rowsRegenSeats')}>
            <input
              type="number"
              min={1}
              max={24}
              className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[14px]"
              value={event.rows}
              disabled={event.layoutType === 'free'}
              onChange={(e) => {
                const rows = clampSeatMapDimension(Number(e.target.value), 24);
                updateLocal((cur) => {
                  if (!cur) return cur;
                  const next: OrganizerEvent = {
                    ...cur,
                    rows,
                    seats:
                      cur.layoutType === 'free'
                        ? []
                        : buildSeatsFromGrid({ ...cur, rows, cols: cur.cols || 10 }),
                  };
                  latestEventRef.current = next;
                  return next;
                });
              }}
              onBlur={() => {
                const cur = latestEventRef.current;
                if (!cur || cur.layoutType === 'free') return;
                saveEventPatch({ rows: cur.rows, cols: cur.cols }, { localSnapshot: cur });
              }}
            />
          </Field>
          <Field label={t('editor.fields.columns')}>
            <input
              type="number"
              min={1}
              max={32}
              className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[14px]"
              value={event.cols}
              disabled={event.layoutType === 'free'}
              onChange={(e) => {
                const cols = clampSeatMapDimension(Number(e.target.value), 32);
                updateLocal((cur) => {
                  if (!cur) return cur;
                  const next: OrganizerEvent = {
                    ...cur,
                    cols,
                    seats:
                      cur.layoutType === 'free'
                        ? []
                        : buildSeatsFromGrid({ ...cur, rows: cur.rows || 6, cols }),
                  };
                  latestEventRef.current = next;
                  return next;
                });
              }}
              onBlur={() => {
                const cur = latestEventRef.current;
                if (!cur || cur.layoutType === 'free') return;
                saveEventPatch({ rows: cur.rows, cols: cur.cols }, { localSnapshot: cur });
              }}
            />
          </Field>
        </div>
        <div className="mt-6">
          <RecurrenceManager
            value={event.recurrence ?? null}
            onChange={(r) => {
              updateLocal((cur) => ({ ...cur, recurrence: r }));
              saveEventPatch({ recurrence: r });
            }}
          />
        </div>
        {event.occurrences.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-ink-10 bg-white p-4">
            <h3 className="text-[14px] font-extrabold text-ink">{t('recurrence.occurrencesTitle')}</h3>
            <ul className="mt-2 space-y-2">
              {event.occurrences.map((occ) => (
                <li key={occ.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-10 px-3 py-2 text-[12px]">
                  <span className="font-mono text-ink">{formatDateTime(occ.startsAt, language)}</span>
                  <span className="rounded-full bg-ink-5 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-60">{t(`recurrence.occurrenceStatus.${occ.status}`)}</span>
                  {occ.status !== 'cancelled' ? (
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-coral hover:underline"
                      onClick={() => {
                        void (async () => {
                          await cancelOccurrence(event.id, occ.id);
                          await reloadFromServer();
                        })();
                      }}
                    >
                      {t('recurrence.cancelOccurrence')}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
      ) : null}

      {activeTab === 'seats' ? (
      <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold text-ink">{t('editor.tabs.seats')}</h2>
        <div className="mt-4">
          <SeatLayoutBuilder
            event={event}
            onApplyTemplate={(rows, cols) => {
              const r = clampSeatMapDimension(rows, 24);
              const c = clampSeatMapDimension(cols, 32);
              const seats = buildSeatsFromGrid({ ...event, rows: r, cols: c, ticketTypes: event.ticketTypes });
              const next = { ...event, rows: r, cols: c, seats };
              latestEventRef.current = next;
              updateLocal(() => next);
              saveEventPatch({ rows: r, cols: c }, { localSnapshot: next });
            }}
            onChangeSeats={(seats) => {
              updateLocal((cur) => {
                if (!cur) return cur;
                const next = { ...cur, seats };
                latestEventRef.current = next;
                return next;
              });
              const cur = latestEventRef.current;
              if (cur) saveEventPatch({ seats }, { localSnapshot: cur });
            }}
            onChangeSpacing={(patch) => {
              updateLocal((cur) => ({ ...cur, ...patch }));
              saveEventPatch(patch);
            }}
          />
        </div>
      </section>
      ) : null}

      {activeTab === 'tickets' ? (
      <section className="rounded-3xl border border-ink-10 bg-ink-5/40 p-6 shadow-card-sm">
        <h2 className="text-lg font-extrabold text-ink">{t('editor.tabs.tickets')}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label={t('editor.fields.entryMode')}>
            <select
              className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 text-[14px]"
              value={event.entryMode}
              onChange={(e) => {
                const entryMode = e.target.value as EntryMode;
                updateLocal((cur) => ({ ...cur, entryMode }));
                saveEventPatch({ entryMode });
              }}
            >
              <option value="one_time">{t('entryMode.one_time')}</option>
              <option value="multi_scan">{t('entryMode.multi_scan')}</option>
            </select>
          </Field>
          <Field label={t('editor.fields.purchaseLimit')}>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[14px]"
              value={event.purchaseLimitPerUser ?? ''}
              placeholder={t('editor.placeholders.unlimited')}
              onChange={(e) => {
                const v = e.target.value;
                updateLocal((cur) => ({ ...cur, purchaseLimitPerUser: v ? Number(v) : undefined }));
              }}
              onBlur={(e) => {
                const v = e.target.value;
                saveEventPatch({ purchaseLimitPerUser: v ? Number(v) : undefined });
              }}
            />
          </Field>
          <Field label={t('editor.fields.multiDayTicketing')}>
            <label className="mt-2 flex items-center gap-2 text-[14px] text-ink-60">
              <input
                type="checkbox"
                checked={event.multiDaySingleTicket}
                onChange={(e) => {
                  const multiDaySingleTicket = e.target.checked;
                  updateLocal((cur) => ({ ...cur, multiDaySingleTicket }));
                  saveEventPatch({ multiDaySingleTicket });
                }}
              />
              {t('editor.tickets.multiDayHint')}
            </label>
          </Field>
          {event.layoutType === 'free' ? (
            <Field label={t('editor.fields.maxCapacity')}>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 font-mono text-[14px]"
                value={event.capacity}
                onChange={(e) => updateLocal((cur) => ({ ...cur, capacity: Number(e.target.value) }))}
                onBlur={(e) => saveEventPatch({ capacity: Number(e.target.value) })}
              />
            </Field>
          ) : null}
        </div>
        <div className="mt-5 rounded-2xl border border-ink-10 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[14px] font-extrabold text-ink">{t('editor.tickets.ticketTypes')}</h3>
            <span className="max-w-md text-[11px] text-ink-40">{t('editor.tickets.apiNote')}</span>
          </div>
          <div className="mt-3 space-y-2">
            {event.ticketTypes.map((tt) => (
              <div key={tt.id} className="grid gap-2 rounded-xl border border-ink-10 p-2 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
                <input
                  className="rounded-lg border border-ink-10 px-2 py-1.5 text-[12px]"
                  value={tt.label}
                  onChange={(e) => {
                    const next = event.ticketTypes.map((x) => (x.id === tt.id ? { ...x, label: e.target.value } : x));
                    updateLocal((cur) => ({ ...cur, ticketTypes: next }));
                  }}
                  onBlur={() => {
                    void (async () => {
                      try {
                        if (!tt.label.trim()) return;
                        if (!isServerNumericTicketTypeId(tt.id)) {
                          await refreshTicketTypes();
                          return;
                        }
                        await updateEventTicketTypeApi(event.id, tt.id, {
                          label: tt.label,
                          defaultPrice: tt.defaultPrice,
                          quantityLimit: tt.quantityLimit,
                        });
                        await refreshTicketTypes();
                      } catch (err) {
                        toastApiErr(err, t('editor.toasts.ticketTypeSaveFailed'));
                      }
                    })();
                  }}
                />
                <input
                  type="number"
                  className="rounded-lg border border-ink-10 px-2 py-1.5 font-mono text-[12px]"
                  value={tt.defaultPrice}
                  onChange={(e) => {
                    const next = event.ticketTypes.map((x) => (x.id === tt.id ? { ...x, defaultPrice: Number(e.target.value) } : x));
                    updateLocal((cur) => ({ ...cur, ticketTypes: next }));
                  }}
                  onBlur={() => {
                    void (async () => {
                      try {
                        if (!isServerNumericTicketTypeId(tt.id)) {
                          await refreshTicketTypes();
                          return;
                        }
                        await updateEventTicketTypeApi(event.id, tt.id, {
                          label: tt.label,
                          defaultPrice: tt.defaultPrice,
                          quantityLimit: tt.quantityLimit,
                        });
                        await refreshTicketTypes();
                      } catch (err) {
                        toastApiErr(err, t('editor.toasts.ticketTypeSaveFailed'));
                      }
                    })();
                  }}
                />
                {event.layoutType === 'free' ? (
                  <input
                    type="number"
                    min={0}
                    className="rounded-lg border border-ink-10 px-2 py-1.5 font-mono text-[12px]"
                    value={tt.quantityLimit ?? 0}
                    onChange={(e) => {
                      const next = event.ticketTypes.map((x) =>
                        x.id === tt.id ? { ...x, quantityLimit: Number(e.target.value) } : x
                      );
                      updateLocal((cur) => ({ ...cur, ticketTypes: next }));
                    }}
                    onBlur={() => {
                      void (async () => {
                        try {
                          if (!isServerNumericTicketTypeId(tt.id)) {
                            await refreshTicketTypes();
                            return;
                          }
                          await updateEventTicketTypeApi(event.id, tt.id, {
                            label: tt.label,
                            defaultPrice: tt.defaultPrice,
                            quantityLimit: tt.quantityLimit,
                          });
                          await refreshTicketTypes();
                        } catch (err) {
                          toastApiErr(err, t('editor.toasts.ticketTypeSaveFailed'));
                        }
                      })();
                    }}
                  />
                ) : (
                  <div className="rounded-lg border border-ink-10 bg-ink-5 px-2 py-1.5 text-[11px] text-ink-40">{t('editor.tickets.perSeat')}</div>
                )}
                <button
                  type="button"
                  className="rounded-full px-2 py-1 text-[11px] font-semibold text-coral hover:bg-coral/10"
                  onClick={() => {
                    void (async () => {
                      const next = event.ticketTypes.filter((x) => x.id !== tt.id);
                      if (next.length === 0) return;
                      try {
                        if (isServerNumericTicketTypeId(tt.id)) {
                          await deleteEventTicketTypeApi(event.id, tt.id);
                          await refreshTicketTypes();
                        } else {
                          updateLocal((cur) => (cur ? { ...cur, ticketTypes: next } : cur));
                        }
                      } catch (err) {
                        toastApiErr(err, t('editor.toasts.ticketTypeRemoveFailed'));
                      }
                    })();
                  }}
                >
                  {t('remove', { ns: 'common' })}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="min-w-[220px] flex-1 rounded-xl border border-ink-10 px-3 py-2 text-[13px]"
              placeholder={t('editor.placeholders.newTicketType')}
              value={newTicketTypeLabel}
              onChange={(e) => setNewTicketTypeLabel(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void (async () => {
                  const label = newTicketTypeLabel.trim();
                  if (!label) return;
                  try {
                    await createEventTicketTypeApi(event.id, {
                      label,
                      defaultPrice: 80,
                      quantityLimit: event.layoutType === 'free' ? 1 : undefined,
                    });
                    setNewTicketTypeLabel('');
                    await refreshTicketTypes();
                  } catch (err) {
                    toastApiErr(err, t('editor.toasts.ticketTypeAddFailed'));
                  }
                })();
              }}
            >
              {t('editor.tickets.addType')}
            </Button>
          </div>
          {event.layoutType === 'free' ? (
            <p className={`mt-3 text-[12px] ${freeValidation.ok ? 'text-mint-dark' : 'text-coral'}`}>
              {t('editor.tickets.freeLayoutQuantities', { total: freeValidation.total, capacity: freeValidation.capacity })}{' '}
              {!freeValidation.ok ? t('editor.tickets.exceedsCapacity') : t('editor.tickets.withinCapacity')}
            </p>
          ) : null}
        </div>
        {event.status === 'sold_out' ? (
          <div className="mt-4 rounded-2xl border border-indigo/30 bg-indigo/10 p-4 text-[13px] text-ink">
            {t('editor.tickets.waitlist', { count: event.waitlistCount ?? 0 })}
          </div>
        ) : null}
      </section>
      ) : null}

      {activeTab === 'partners' ? (
        <EventPartnersTab event={event} onPatch={(patch) => saveEventPatch(patch)} />
      ) : null}

      {activeTab === 'more' ? (
        <>
      {showPostEventMedia ? (
        <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">{t('editor.tabs.more')}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              className="min-w-[200px] flex-1 rounded-xl border border-ink-10 px-3 py-2 text-[14px]"
              placeholder={t('editor.placeholders.filenameOrLabel')}
              value={mediaLabel}
              onChange={(e) => setMediaLabel(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => {
                if (!mediaLabel.trim()) return;
                const nextMedia = [...event.postEventMedia, { kind: 'photo' as const, label: mediaLabel.trim() }];
                setMediaLabel('');
                updateLocal((cur) => ({ ...cur, postEventMedia: nextMedia }));
                saveEventPatch({ postEventMedia: nextMedia });
              }}
            >
              {t('editor.more.addMediaDemo')}
            </Button>
          </div>
          <ul className="mt-3 text-[13px] text-ink-60">
            {event.postEventMedia.map((m, i) => (
              <li key={`${m.label}-${i}`}>
                {postEventMediaKindLabel(m.kind)}: {m.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {notifications.length > 0 ? (
        <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <h2 className="text-lg font-extrabold text-ink">{t('editor.notifications.title')}</h2>
          <ul className="mt-3 space-y-2">
            {notifications.slice(-5).reverse().map((n) => (
              <li key={n.id} className="rounded-xl border border-ink-10 bg-ink-5/40 px-3 py-2 text-[12px]">
                <p className="font-semibold text-ink">
                  {n.kind === 'cancelled' ? t('editor.notifications.cancelledNotice') : t('editor.notifications.publishUpdateNotice')} ·{' '}
                  {formatDateTime(n.createdAt, language)}
                </p>
                {n.changes?.length ? (
                  <p className="mt-1 text-ink-60">{t('editor.notifications.changedFields', { count: n.changes.length })}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!moreHasContent ? (
        <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <p className="text-[14px] text-ink-60">{t('editor.more.empty')}</p>
        </section>
      ) : null}
        </>
      ) : null}

      <PublishImpactDialog
        open={impactOpen}
        changes={impactChanges}
        onCancel={() => {
          setImpactOpen(false);
          setPendingPatch(null);
          void reloadFromServer({ discardLocal: true });
        }}
        onConfirm={confirmImpactSave}
      />

      {cancelOpen ? (
        <CancellationFlow
          eventId={event.id}
          eventTitle={event.title}
          onClose={() => setCancelOpen(false)}
          onDone={() => {
            setCancelOpen(false);
            void reloadFromServer();
          }}
        />
      ) : null}
    </div>
  );
}

function resolvePublicUrl(url: string) {
  const u = url.trim();
  if (!u) return u;
  if (/^https?:\/\//i.test(u) || u.startsWith('data:')) return u;
  if (u.startsWith('/')) {
    try {
      return new URL(u, ApiBaseUrl).toString();
    } catch {
      return u;
    }
  }
  return u;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span className="text-[12px] font-semibold text-ink-60">{label}</span>
      {children}
    </label>
  );
}

