import { z } from 'zod';

export const loginUserSchema = z
  .object({
    id: z.coerce.number(),
    email: z.string(),
    full_name: z.string().optional(),
    role: z.string(),
  })
  .passthrough();

export const loginSuccessSchema = z
  .object({
    token: z.string(),
    refresh_token: z.string().nullable().optional(),
    expires_at: z.string().optional(),
    user: loginUserSchema,
  })
  .passthrough();

export const loginTwoFactorChallengeSchema = z.object({
  challenge_token: z.string(),
  two_factor_required: z.literal(true),
});

export const refreshTokenResponseSchema = z.object({
  token: z.string(),
});

export const healthResponseSchema = z.object({
  app: z.string(),
  status: z.string(),
  version: z.string(),
  time: z.string(),
});

export const versionResponseSchema = z.object({
  app: z.string(),
  api_version: z.string(),
  phase: z.string(),
});
