import type { UserRole } from '@/types/domain';
import { createContext } from 'react';

export type SessionUser = {
  email: string;
  name: string;
  role: UserRole;
};

export type AuthContextValue = {
  user: SessionUser | null;
  signIn: (params: { email: string; password: string }) => { ok: true } | { ok: false; reason: 'invalid' | 'not_organizer' };
  signInGoogleMock: () => void;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
