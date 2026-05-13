import type { UserRole } from '@/types/domain';
import { createContext } from 'react';

export type SessionUser = {
  email: string;
  name: string;
  role: UserRole;
};

export type AuthContextValue = {
  user: SessionUser | null;
  signIn: (
    params: { email: string; password: string } | { challengeToken: string; otp: string }
  ) => Promise<
    | { ok: true }
    | { ok: false; reason: 'invalid' | 'not_organizer' | 'two_factor_required'; challengeToken?: string }
  >;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
