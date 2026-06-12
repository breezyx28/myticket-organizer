import type { SessionUser } from '@/contexts/organizerAuthContext';
import { extractAccessTokenFromLoginResponse, extractUserFromLoginResponse } from '@/lib/api/extractAuth';
import { loginSuccessSchema, loginTwoFactorChallengeSchema } from '@/schemas/organizer/responses/auth';

export type LoginMutationResult =
  | { kind: 'success'; accessToken: string; user: SessionUser | null }
  | { kind: 'two_factor_required'; challengeToken: string };

export function parseLoginMutationResult(raw: unknown): LoginMutationResult {
  const ch = loginTwoFactorChallengeSchema.safeParse(raw);
  if (ch.success) return { kind: 'two_factor_required', challengeToken: ch.data.challenge_token };
  const ok = loginSuccessSchema.safeParse(raw);
  if (ok.success) {
    const u = ok.data.user;
    const name =
      typeof u.full_name === 'string' && u.full_name.trim()
        ? u.full_name
        : typeof u.email === 'string'
          ? u.email.split('@')[0] || 'Organizer'
          : 'Organizer';
    const userId = u.id != null ? String(u.id) : '';
    const user: SessionUser | null =
      typeof u.email === 'string' && u.email
        ? { id: userId, email: u.email, name, role: 'organizer' }
        : null;
    return { kind: 'success', accessToken: ok.data.token, user };
  }
  const legacy = extractAccessTokenFromLoginResponse(raw);
  if (legacy) {
    const u = extractUserFromLoginResponse(raw);
    const user: SessionUser | null = u
      ? { id: u.id ?? '', email: u.email, name: u.name, role: 'organizer' }
      : null;
    return { kind: 'success', accessToken: legacy, user };
  }
  throw new Error('Invalid login response');
}
