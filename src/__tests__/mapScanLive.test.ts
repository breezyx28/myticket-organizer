import { describe, expect, it } from 'vitest';
import {
  echoChannelFromApi,
  formatScanFailureReason,
  mapApiScanBatchPayload,
  mapApiScanLiveBootstrap,
  mapApiScanLiveRow,
  mapApiScanLiveStats,
  mergeScanRows,
  prependScanRows,
} from '@/lib/api/mapScanLive';

describe('mapScanLive', () => {
  it('maps bootstrap with reverb transport', () => {
    const boot = mapApiScanLiveBootstrap({
      transport: 'reverb',
      channel: 'private-organizer.event.18.scans',
      auth_endpoint: 'https://api.example.com/broadcasting/auth',
      initial_stats: {
        ok: 10,
        duplicate: 1,
        invalid: 0,
        expired: 0,
        wrong_event: 0,
        total: 11,
        active_scanners: 2,
      },
    });
    expect(boot.transport).toBe('reverb');
    expect(boot.channel).toBe('private-organizer.event.18.scans');
    expect(boot.initialStats.ok).toBe(10);
    expect(boot.initialStats.activeScanners).toBe(2);
  });

  it('maps cross-organizer wrong_event failure_reason from handoff', () => {
    const row = mapApiScanLiveRow(
      {
        id: 102,
        event_id: 18,
        ticket_ref: 'TIC-X',
        result: 'wrong_event',
        failure_reason: 'scanner_not_owned_by_event_organizer',
        scanned_at: '2026-05-20T12:16:00Z',
      },
      '18'
    );
    expect(row?.result).toBe('wrong_event');
    expect(row?.failureReason).toBe('scanner_not_owned_by_event_organizer');
    expect(formatScanFailureReason(row?.failureReason)).toBe('Scanner is not owned by this event organizer');
  });

  it('maps scan row from handoff shape', () => {
    const row = mapApiScanLiveRow(
      {
        id: 101,
        event_id: 18,
        scanner_account_id: 1,
        scanner_name: 'Gate A',
        device_id: 3,
        ticket_ref: 'TIC-ABC',
        result: 'ok',
        scanned_at: '2026-05-20T12:15:35Z',
      },
      '18'
    );
    expect(row?.scannerName).toBe('Gate A');
    expect(row?.ticketRef).toBe('TIC-ABC');
    expect(row?.result).toBe('ok');
    expect(row?.deviceId).toBe('3');
  });

  it('maps stats envelope', () => {
    const stats = mapApiScanLiveStats({
      stats: {
        ok: 121,
        duplicate: 4,
        invalid: 2,
        expired: 1,
        wrong_event: 1,
        total: 129,
        last_scan_at: '2026-05-20T12:15:35Z',
      },
    });
    expect(stats.total).toBe(129);
    expect(stats.expired).toBe(1);
    expect(stats.lastScanAt).toBe('2026-05-20T12:15:35Z');
  });

  it('maps batch payload items', () => {
    const rows = mapApiScanBatchPayload(
      {
        payload: {
          event_id: 18,
          count: 1,
          items: [{ id: 5, ticket_ref: 'X', result: 'duplicate', scanner_name: 'B', scanned_at: '2026-05-20T12:00:00Z' }],
        },
      },
      '18'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.result).toBe('duplicate');
  });

  it('strips private- prefix for echo channel', () => {
    expect(echoChannelFromApi('private-organizer.event.18.scans', '18')).toBe('organizer.event.18.scans');
    expect(echoChannelFromApi('', '18')).toBe('organizer.event.18.scans');
  });
});

describe('scan live feed merge', () => {
  const base = {
    eventId: '1',
    scannerId: '1',
    ticketRef: 'T',
    at: '2026-05-20T12:00:00Z',
    result: 'ok' as const,
  };

  it('prepends without duplicates', () => {
    const existing = [{ ...base, id: '1' }];
    const incoming = [
      { ...base, id: '2', at: '2026-05-20T12:01:00Z' },
      { ...base, id: '1' },
    ];
    const next = prependScanRows(existing, incoming);
    expect(next).toHaveLength(2);
    expect(next[0]?.id).toBe('2');
  });

  it('merges by id and sorts newest first', () => {
    const existing = [{ ...base, id: '1', at: '2026-05-20T12:00:00Z' }];
    const incoming = [{ ...base, id: '2', at: '2026-05-20T12:02:00Z' }];
    const next = mergeScanRows(existing, incoming);
    expect(next[0]?.id).toBe('2');
  });
});
