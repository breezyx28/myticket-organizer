import {
  cloneEvent,
  clearPersistedDraft,
  loadPersistedDraft,
  mergeAfterSave,
  mergePersistedDraftWithServer,
  mergeTicketTypesFromServer,
  persistDraft,
  bumpRemoteRevision,
  readRemoteRevision,
  revisionStorageKey,
  tabStorageKey,
  updateCommittedAfterSave,
  writeTabLease,
} from '@/lib/eventEditorSync';
import { getEvent, patchEvent } from '@/services/eventsService';
import type { OrganizerEvent } from '@/types/domain';
import { useCallback, useEffect, useRef, useState } from 'react';

const PERSIST_DEBOUNCE_MS = 400;
const TAB_STALE_MS = 6000;
const TAB_HEARTBEAT_MS = 2000;

export type SaveOptions = {
  localSnapshot?: OrganizerEvent;
};

export function useEventEditorSync(eventId: string | undefined) {
  const [event, setEvent] = useState<OrganizerEvent | null>(null);
  const [loading, setLoading] = useState(Boolean(eventId && eventId !== 'new'));
  const [concurrentTabWarning, setConcurrentTabWarning] = useState(false);

  const committed = useRef<OrganizerEvent | null>(null);
  const latestEventRef = useRef<OrganizerEvent | null>(null);
  const saveChainRef = useRef(Promise.resolve());
  const saveEpochRef = useRef(0);
  const lastSeenRevisionRef = useRef(0);
  const tabIdRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `tab-${Date.now()}`
  );
  const persistTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const schedulePersist = useCallback(
    (draft: OrganizerEvent) => {
      if (!eventId || eventId === 'new') return;
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = window.setTimeout(() => {
        persistTimerRef.current = null;
        persistDraft(eventId, draft);
      }, PERSIST_DEBOUNCE_MS);
    },
    [eventId]
  );

  const updateLocal = useCallback(
    (updater: (e: OrganizerEvent) => OrganizerEvent) => {
      setEvent((cur) => {
        if (!cur) return cur;
        const next = updater(cur);
        latestEventRef.current = next;
        schedulePersist(next);
        return next;
      });
    },
    [schedulePersist]
  );

  const reloadFromServer = useCallback(
    async (opts?: { discardLocal?: boolean }) => {
      if (!eventId) return null;
      const server = await getEvent(eventId);
      if (!server) {
        setEvent(null);
        committed.current = null;
        latestEventRef.current = null;
        return null;
      }

      if (opts?.discardLocal) {
        setEvent(server);
        committed.current = cloneEvent(server);
        latestEventRef.current = server;
        clearPersistedDraft(eventId);
        lastSeenRevisionRef.current = readRemoteRevision(eventId);
        return server;
      }

      setEvent((cur) => {
        const base = committed.current ?? cur ?? server;
        const merged = cur ? mergeAfterSave(cur, server, base, {}) : server;
        latestEventRef.current = merged;
        committed.current = cloneEvent(server);
        schedulePersist(merged);
        return merged;
      });
      lastSeenRevisionRef.current = readRemoteRevision(eventId);
      return server;
    },
    [eventId, schedulePersist]
  );

  const refreshTicketTypes = useCallback(async () => {
    if (!eventId) return;
    const server = await getEvent(eventId);
    if (!server) return;
    const baseline = latestEventRef.current ?? event;
    if (!baseline) return;
    setEvent((cur) => {
      if (!cur) return cur;
      const merged = mergeTicketTypesFromServer(cur, server, baseline);
      latestEventRef.current = merged;
      if (committed.current) {
        committed.current = {
          ...committed.current,
          ticketTypes: merged.ticketTypes,
          ticketsSold: server.ticketsSold,
          revenueGross: server.revenueGross,
          waitlistCount: server.waitlistCount,
        };
      }
      schedulePersist(merged);
      return merged;
    });
    bumpRemoteRevision(eventId);
    lastSeenRevisionRef.current = readRemoteRevision(eventId);
  }, [eventId, event, schedulePersist]);

  const runSave = useCallback(
    (
      patch: Partial<OrganizerEvent>,
      options: SaveOptions | undefined,
      handlers?: { onError?: (err: unknown) => void; onSuccess?: () => void }
    ) => {
      if (!eventId || !committed.current) return;
      const syncEventId = eventId;

      const baseline = cloneEvent(
        options?.localSnapshot ?? latestEventRef.current ?? event ?? committed.current
      );
      const epoch = ++saveEpochRef.current;

      saveChainRef.current = saveChainRef.current.then(async () => {
        try {
          const server = await patchEvent(syncEventId, patch);
          if (epoch < saveEpochRef.current) return;

          setEvent((cur) => {
            if (!cur) return cur;
            const merged = mergeAfterSave(cur, server, baseline, patch);
            latestEventRef.current = merged;
            if (committed.current && server) {
              committed.current = updateCommittedAfterSave(committed.current, server, patch);
            }
            schedulePersist(merged);
            return merged;
          });

          bumpRemoteRevision(syncEventId);
          lastSeenRevisionRef.current = readRemoteRevision(syncEventId);
          handlers?.onSuccess?.();
        } catch (err) {
          handlers?.onError?.(err);
        }
      });
    },
    [eventId, event, schedulePersist]
  );

  const save = useCallback(
    (patch: Partial<OrganizerEvent>, options?: SaveOptions) => {
      runSave(patch, options);
    },
    [runSave]
  );

  const saveWithToast = useCallback(
    (
      patch: Partial<OrganizerEvent>,
      options: SaveOptions | undefined,
      onError: (err: unknown) => void,
      onSuccess?: () => void
    ) => {
      runSave(patch, options, { onError, onSuccess });
    },
    [runSave]
  );

  useEffect(() => {
    if (!eventId || eventId === 'new') {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const server = await getEvent(eventId);
      if (cancelled) return;

      if (!server) {
        setEvent(null);
        committed.current = null;
        latestEventRef.current = null;
        setLoading(false);
        return;
      }

      const persisted = loadPersistedDraft(eventId);
      const draft = persisted ? mergePersistedDraftWithServer(persisted.draft, server) : server;

      setEvent(draft);
      committed.current = cloneEvent(server);
      latestEventRef.current = draft;
      lastSeenRevisionRef.current = readRemoteRevision(eventId);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    if (!eventId || eventId === 'new') return;
    const syncEventId = eventId;

    const tabId = tabIdRef.current;
    writeTabLease(syncEventId, tabId);

    const heartbeat = window.setInterval(() => writeTabLease(syncEventId, tabId), TAB_HEARTBEAT_MS);

    function onStorage(e: StorageEvent) {
      if (!e.key) return;

      if (e.key === tabStorageKey(syncEventId) && e.newValue) {
        try {
          const lease = JSON.parse(e.newValue) as { tabId: string; updatedAt: number };
          if (lease.tabId !== tabId && Date.now() - lease.updatedAt < TAB_STALE_MS) {
            setConcurrentTabWarning(true);
          }
        } catch {
          /* ignore */
        }
      }

      if (e.key === revisionStorageKey(syncEventId) && e.newValue) {
        const rev = Number(e.newValue);
        if (rev > lastSeenRevisionRef.current) {
          setConcurrentTabWarning(true);
        }
      }
    }

    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('storage', onStorage);
    };
  }, [eventId]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, []);

  return {
    event,
    loading,
    committed,
    latestEventRef,
    updateLocal,
    save,
    saveWithToast,
    reloadFromServer,
    refreshTicketTypes,
    concurrentTabWarning,
    dismissConcurrentTabWarning: () => setConcurrentTabWarning(false),
    clearPersistedDraftForEvent: () => {
      if (eventId) clearPersistedDraft(eventId);
    },
  };
}
