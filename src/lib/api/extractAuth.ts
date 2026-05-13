export function extractAccessTokenFromLoginResponse(data: unknown): string | null {
  if (data == null || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (typeof o.token === 'string') return o.token;
  if (typeof o.access_token === 'string') return o.access_token;
  if (typeof o.plainTextToken === 'string') return o.plainTextToken;
  const inner = o.data;
  if (inner && typeof inner === 'object') {
    const d = inner as Record<string, unknown>;
    if (typeof d.token === 'string') return d.token;
    if (typeof d.access_token === 'string') return d.access_token;
    if (typeof d.plainTextToken === 'string') return d.plainTextToken;
  }
  return null;
}

export function extractUserFromLoginResponse(data: unknown): { email: string; name: string } | null {
  if (data == null || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const u = (o.user ?? o.organizer ?? (o.data as Record<string, unknown> | undefined)?.user) as Record<string, unknown> | undefined;
  if (!u || typeof u !== 'object') return null;
  const email = typeof u.email === 'string' ? u.email : '';
  const name =
    typeof u.name === 'string'
      ? u.name
      : typeof u.full_name === 'string'
        ? u.full_name
        : typeof u.display_name === 'string'
          ? u.display_name
          : email.split('@')[0] || 'Organizer';
  if (!email) return null;
  return { email, name };
}
