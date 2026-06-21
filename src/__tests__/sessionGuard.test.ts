import { describe, expect, it, vi } from 'vitest';
import {
  isUnauthorizedStatus,
  notifySessionExpired,
  registerSessionExpiredHandler,
  resetSessionExpiredGuard,
} from '@/lib/auth/sessionGuard';

describe('sessionGuard', () => {
  it('detects 401 status', () => {
    expect(isUnauthorizedStatus(401)).toBe(true);
    expect(isUnauthorizedStatus(403)).toBe(false);
    expect(isUnauthorizedStatus('401')).toBe(false);
  });

  it('notifies registered handler once until reset', () => {
    const handler = vi.fn();
    registerSessionExpiredHandler(handler);
    resetSessionExpiredGuard();

    notifySessionExpired();
    notifySessionExpired();

    expect(handler).toHaveBeenCalledTimes(1);

    resetSessionExpiredGuard();
    notifySessionExpired();
    expect(handler).toHaveBeenCalledTimes(2);

    registerSessionExpiredHandler(null);
  });

  it('passes silent option to handler', () => {
    const handler = vi.fn();
    registerSessionExpiredHandler(handler);
    resetSessionExpiredGuard();

    notifySessionExpired({ silent: true });
    expect(handler).toHaveBeenCalledWith({ silent: true });

    registerSessionExpiredHandler(null);
  });
});
