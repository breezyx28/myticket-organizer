import { useCallback, useEffect, useRef, useState } from 'react';
import {
  mapApiScanBatchPayload,
  mapApiScanLiveStats,
  mergeScanRows,
  newestScanTimestamp,
  prependScanRows,
} from '@/lib/api/mapScanLive';
import { subscribeEventScans, leaveEventScans } from '@/lib/realtime/channels';
import type { ScanBatchPayload, ScanLiveStatsPayload } from '@/lib/realtime/types';
import { fetchScanLive, pollScanLogsSince } from '@/services/scannersService';
import type { ScanLiveRow, ScanLiveStats } from '@/types/domain';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';

export type ScanLiveConnection = 'connecting' | 'live' | 'polling' | 'error';

const POLL_INTERVAL_MS = 30_000;
const EMPTY_STATS: ScanLiveStats = {
  ok: 0,
  duplicate: 0,
  invalid: 0,
  expired: 0,
  wrong_event: 0,
  total: 0,
};

function statsFromPayload(payload: ScanLiveStatsPayload): ScanLiveStats {
  return mapApiScanLiveStats({ stats: payload.stats });
}

export function useEventScanLive(eventId: string, open: boolean) {
  const [rows, setRows] = useState<ScanLiveRow[]>([]);
  const [stats, setStats] = useState<ScanLiveStats>(EMPTY_STATS);
  const [connection, setConnection] = useState<ScanLiveConnection>('connecting');
  const [error, setError] = useState<string | null>(null);
  const rowsRef = useRef(rows);
  const statsRef = useRef(stats);
  const sinceRef = useRef<string | undefined>(undefined);
  const pollTimerRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  const bootstrapRef = useRef<Awaited<ReturnType<typeof fetchScanLive>> | null>(null);

  rowsRef.current = rows;
  statsRef.current = stats;

  const unsubRef = useRef<(() => void) | null>(null);

  const reconcile = useCallback(async () => {
    if (!eventId) return;
    const since = sinceRef.current ?? newestScanTimestamp(rowsRef.current, statsRef.current);
    try {
      const incoming = await pollScanLogsSince(eventId, since);
      if (incoming.length === 0) return;
      setRows((prev) => mergeScanRows(prev, incoming));
      const newest = newestScanTimestamp(incoming, statsRef.current);
      if (newest) sinceRef.current = newest;
    } catch {
      /* polling reconcile is best-effort */
    }
  }, [eventId]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    pollTimerRef.current = window.setInterval(() => {
      void reconcile();
    }, POLL_INTERVAL_MS);
  }, [reconcile]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const handleBatch = useCallback(
    (payload: ScanBatchPayload) => {
      if (String(payload.event_id) !== eventId) return;
      const incoming = mapApiScanBatchPayload({ payload }, eventId);
      if (incoming.length === 0) return;
      setRows((prev) => prependScanRows(prev, incoming));
      const newest = newestScanTimestamp(incoming);
      if (newest) sinceRef.current = newest;
    },
    [eventId]
  );

  const handleStats = useCallback((payload: ScanLiveStatsPayload) => {
    if (String(payload.event_id) !== eventId) return;
    const next = statsFromPayload(payload);
    setStats(next);
    if (next.lastScanAt) sinceRef.current = next.lastScanAt;
  }, [eventId]);

  const bootstrap = useCallback(async () => {
    if (!eventId) return;
    setConnection('connecting');
    setError(null);
    try {
      const config = await fetchScanLive(eventId);
      bootstrapRef.current = config;
      setStats(config.initialStats);
      if (config.initialStats.lastScanAt) {
        sinceRef.current = config.initialStats.lastScanAt;
      }

      if (config.transport === 'reverb') {
        setConnection('live');
        const eid = Number(eventId);
        if (Number.isFinite(eid) && eid > 0) {
          unsubRef.current?.();
          unsubRef.current = subscribeEventScans(
            eid,
            { onBatch: handleBatch, onStats: handleStats },
            config.channel
          );
        }
        startPolling();
        void reconcile();
        return;
      }

      setConnection('polling');
      stopPolling();
      startPolling();
      await reconcile();
    } catch (err) {
      setConnection('error');
      setError(formatOrganizerApiError(err));
      setConnection('polling');
      startPolling();
      try {
        await reconcile();
      } catch {
        /* ignore */
      }
    }
  }, [eventId, handleBatch, handleStats, reconcile, startPolling, stopPolling]);

  useEffect(() => {
    if (!open || !eventId) {
      stopPolling();
      leaveEventScans();
      return;
    }

    setRows([]);
    setStats(EMPTY_STATS);
    sinceRef.current = undefined;
    bootstrapRef.current = null;
    void bootstrap();

    function onFocus() {
      void reconcile();
    }
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      unsubRef.current?.();
      unsubRef.current = null;
      stopPolling();
      leaveEventScans();
    };
  }, [open, eventId, bootstrap, reconcile, stopPolling]);

  return {
    rows,
    stats,
    connection,
    error,
    retry: bootstrap,
    reconcile,
  };
}
