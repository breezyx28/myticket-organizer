export type SessionExpiredOptions = {
  /** Skip user-facing toast (e.g. explicit sign-out). */
  silent?: boolean;
};

type SessionExpiredHandler = (options?: SessionExpiredOptions) => void;

let handler: SessionExpiredHandler | null = null;
let expiryNotified = false;

/** Register the handler that clears client auth state (AuthProvider). */
export function registerSessionExpiredHandler(fn: SessionExpiredHandler | null) {
  handler = fn;
  if (!fn) expiryNotified = false;
}

/** Allow a new login after manual sign-out or successful sign-in. */
export function resetSessionExpiredGuard() {
  expiryNotified = false;
}

/**
 * Called when the API returns 401 and token refresh cannot recover the session.
 * Idempotent — concurrent 401s only trigger one logout.
 */
export function notifySessionExpired(options?: SessionExpiredOptions) {
  if (expiryNotified) return;
  expiryNotified = true;
  handler?.(options);
}

export function isUnauthorizedStatus(status: unknown): boolean {
  return status === 401;
}
