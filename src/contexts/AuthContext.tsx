import { AuthContext, type AuthContextValue, type SessionUser } from '@/contexts/organizerAuthContext';
import type { UserRole } from '@/types/domain';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

const SESSION_KEY = 'myticket_organizer_session_v1';

function loadSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

function saveSession(u: SessionUser | null) {
  if (!u) sessionStorage.removeItem(SESSION_KEY);
  else sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
}

/** Demo: only organizer@myticket.demo / password OR any email containing "+organizer" */
function resolveDemoRole(email: string): UserRole | null {
  const e = email.trim().toLowerCase();
  if (e === 'organizer@myticket.demo') return 'organizer';
  if (e.includes('+organizer')) return 'organizer';
  if (e.includes('attendee') || e.includes('+buyer')) return 'attendee';
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => loadSession());

  const signIn = useCallback((params: { email: string; password: string }) => {
    const email = params.email.trim();
    if (!email || params.password.length < 4) return { ok: false as const, reason: 'invalid' as const };
    const role = resolveDemoRole(email);
    if (role === null) return { ok: false as const, reason: 'invalid' as const };
    if (role !== 'organizer') return { ok: false as const, reason: 'not_organizer' as const };
    const next: SessionUser = {
      email,
      name: email.split('@')[0] ?? 'Organizer',
      role: 'organizer',
    };
    setUser(next);
    saveSession(next);
    return { ok: true as const };
  }, []);

  const signInGoogleMock = useCallback(() => {
    const next: SessionUser = {
      email: 'organizer@myticket.demo',
      name: 'Riyadh Nights',
      role: 'organizer',
    };
    setUser(next);
    saveSession(next);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    saveSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      signIn,
      signInGoogleMock,
      signOut,
    }),
    [user, signIn, signInGoogleMock, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
