import { describe, expect, it } from 'vitest';
import { mapApiCreateScannerResponse, mapApiScannerToScannerAccount } from '@/lib/api/mapScanner';

describe('mapScanner', () => {
  it('maps create scanner envelope with credentials_emailed and assignments', () => {
    const result = mapApiCreateScannerResponse({
      data: {
        id: 5,
        name: 'Gate A',
        email: 'gate@example.com',
        is_active: true,
        assignments: [{ id: 12, event_id: 18, scanner_account_id: 5 }],
      },
      credentials_emailed: true,
      assignments: [{ id: 12, event_id: 18, scanner_account_id: 5 }],
    });
    expect(result.credentialsEmailed).toBe(true);
    expect(result.account.id).toBe('5');
    expect(result.account.email).toBe('gate@example.com');
    expect(result.account.assignedEventIds).toContain('18');
    expect(result.account.assignmentIdsByEventId?.['18']).toBe('12');
  });

  it('reads is_active from scanner list payload', () => {
    const s = mapApiScannerToScannerAccount({ id: 3, name: 'X', email: 'x@test.com', is_active: false });
    expect(s.active).toBe(false);
  });
});
