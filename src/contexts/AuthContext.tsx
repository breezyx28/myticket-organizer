import { AuthContext, type AuthContextValue, type SessionUser } from '@/contexts/organizerAuthContext';
import { clearClientAuthSession, ORGANIZER_SESSION_STORAGE_KEY } from '@/lib/auth/clearClientAuthSession';
import {
  registerSessionExpiredHandler,
  resetSessionExpiredGuard,
} from '@/lib/auth/sessionGuard';
import { toast } from '@/lib/appToast';
import { organizerApi, useLoginMutation, useLogoutMutation } from '@/store/api/organizerApi';
import { useAppDispatch } from '@/store/hooks';
import { setAccessToken, ACCESS_TOKEN_STORAGE_KEY } from '@/store/slices/authSlice';
import { apiDispatch, apiUnwrap } from '@/services/apiDispatch';
import type { OrganizerUser, UserRole } from '@/types/domain';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

function loadSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(ORGANIZER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

function saveSession(u: SessionUser | null) {
  if (!u) sessionStorage.removeItem(ORGANIZER_SESSION_STORAGE_KEY);
  else sessionStorage.setItem(ORGANIZER_SESSION_STORAGE_KEY, JSON.stringify(u));
}

function sessionFromProfile(profile: OrganizerUser): SessionUser {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: 'organizer',
  };
}

function sessionFromLoginUser(
  user: { id?: string; email: string; name: string; role: UserRole } | null,
  profile?: OrganizerUser
): SessionUser | null {
  if (profile) return sessionFromProfile(profile);
  if (!user?.email) return null;
  return {
    id: user.id ?? '',
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const [user, setUser] = useState<SessionUser | null>(() => {
    if (typeof sessionStorage === 'undefined') return null;
    const token = sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    const u = loadSession();
    if (!token && u) return null;
    return u;
  });
  const [loginMutation] = useLoginMutation();
  const [logoutMutation] = useLogoutMutation();

  const forceSignOut = useCallback(
    (options?: { silent?: boolean }) => {
      clearClientAuthSession(dispatch);
      setUser(null);
      if (!options?.silent) {
        toast.error(t('sessionExpired'), { id: 'auth:session-expired' });
      }
      navigate('/login', { replace: true, state: { reason: 'session_expired' } });
    },
    [dispatch, navigate, t]
  );

  useEffect(() => {
    registerSessionExpiredHandler((options) => forceSignOut(options));
    return () => registerSessionExpiredHandler(null);
  }, [forceSignOut]);

  const signIn = useCallback(
    async (params: { email: string; password: string } | { challengeToken: string; otp: string }) => {
      if ('challengeToken' in params) {
        try {
          const result = await loginMutation({
            challenge_token: params.challengeToken,
            otp: params.otp,
          }).unwrap();
          if (result.kind === 'two_factor_required') {
            return { ok: false as const, reason: 'two_factor_required' as const, challengeToken: result.challengeToken };
          }
          if (result.kind !== 'success' || !result.accessToken) {
            return { ok: false as const, reason: 'invalid' as const };
          }
          resetSessionExpiredGuard();
          dispatch(setAccessToken(result.accessToken));
          let profile: OrganizerUser | undefined;
          if (!result.user?.id) {
            try {
              profile = await apiUnwrap<OrganizerUser>(apiDispatch(organizerApi.endpoints.getProfile.initiate()));
            } catch {
              dispatch(setAccessToken(null));
              return { ok: false as const, reason: 'invalid' as const };
            }
          }
          const nextUser = sessionFromLoginUser(result.user, profile);
          if (!nextUser || nextUser.role !== 'organizer') {
            dispatch(setAccessToken(null));
            return { ok: false as const, reason: 'not_organizer' as const };
          }
          setUser(nextUser);
          saveSession(nextUser);
          return { ok: true as const };
        } catch {
          return { ok: false as const, reason: 'invalid' as const };
        }
      }

      const email = params.email.trim();
      if (!email || params.password.length < 1) return { ok: false as const, reason: 'invalid' as const };
      try {
        const result = await loginMutation({
          email,
          password: params.password,
        }).unwrap();
        if (result.kind === 'two_factor_required') {
          return { ok: false as const, reason: 'two_factor_required' as const, challengeToken: result.challengeToken };
        }
        if (result.kind !== 'success' || !result.accessToken) {
          return { ok: false as const, reason: 'invalid' as const };
        }
        resetSessionExpiredGuard();
        dispatch(setAccessToken(result.accessToken));
        let profile: OrganizerUser | undefined;
        if (!result.user?.id) {
          try {
            profile = await apiUnwrap<OrganizerUser>(apiDispatch(organizerApi.endpoints.getProfile.initiate()));
          } catch {
            dispatch(setAccessToken(null));
            return { ok: false as const, reason: 'invalid' as const };
          }
        }
        const nextUser = sessionFromLoginUser(result.user, profile);
        if (!nextUser || nextUser.role !== 'organizer') {
          dispatch(setAccessToken(null));
          return { ok: false as const, reason: 'not_organizer' as const };
        }
        setUser(nextUser);
        saveSession(nextUser);
        return { ok: true as const };
      } catch {
        return { ok: false as const, reason: 'invalid' as const };
      }
    },
    [dispatch, loginMutation]
  );

  const signOut = useCallback(async () => {
    resetSessionExpiredGuard();
    try {
      await logoutMutation().unwrap();
    } catch {
      /* still clear client session */
    }
    clearClientAuthSession(dispatch);
    setUser(null);
    navigate('/login', { replace: true });
  }, [dispatch, logoutMutation, navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      signIn,
      signOut,
    }),
    [user, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
