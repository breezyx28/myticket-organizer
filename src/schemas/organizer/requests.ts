import { z } from 'zod';

/** POST /api/v1/organizer/auth/login — credentials or 2FA completion */
export const organizerLoginRequestSchema = z.union([
  z
    .object({
      email: z.string().email().optional(),
      phone: z.string().max(20).optional(),
      password: z.string().min(1),
      otp: z.string().nullable().optional(),
    })
    .refine((d) => d.email != null || d.phone != null, {
      message: 'Either email or phone is required',
      path: ['email'],
    }),
  z.object({
    challenge_token: z.string().min(1),
    otp: z.string().min(1),
  }),
]);

export type OrganizerLoginRequest = z.infer<typeof organizerLoginRequestSchema>;

/** PATCH /api/v1/organizer/me/profile — fields accepted by the Laravel organizer profile update (extend as backend adds columns). */
export const organizerProfilePatchSchema = z.object({
  display_name: z.string().max(160).optional(),
  bio: z.string().nullable().optional(),
  contact_phone: z.string().max(20).nullable().optional(),
  city: z.string().max(180).nullable().optional(),
  city_id: z.number().int().nullable().optional(),
  logo_url: z.string().max(500).nullable().optional(),
  avatar_url: z.string().max(800).nullable().optional(),
  region: z.string().max(64).nullable().optional(),
  region_id: z.number().int().nullable().optional(),
  document_url: z.string().max(500).nullable().optional(),
  gallery_urls: z.array(z.string().max(800)).max(50).nullable().optional(),
  typical_event_duration_hours: z.number().nullable().optional(),
});

export type OrganizerProfilePatch = z.infer<typeof organizerProfilePatchSchema>;

/** POST /api/v1/organizer/scanners */
export const organizerScannerCreateSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  user_id: z.number().int().optional(),
  event_ids: z.array(z.number().int()).optional(),
  gate_label: z.string().max(160).optional(),
});

export type OrganizerScannerCreate = z.infer<typeof organizerScannerCreateSchema>;

/** PATCH /api/v1/organizer/scanners/{id} — at least one field */
export const organizerScannerPatchSchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    is_active: z.boolean().optional(),
    email_credentials: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.email !== undefined ||
      body.password !== undefined ||
      body.is_active !== undefined ||
      body.email_credentials !== undefined,
    { message: 'At least one field is required.' }
  );

export type OrganizerScannerPatch = z.infer<typeof organizerScannerPatchSchema>;

/** POST .../scanners/{id}/assignments */
export const organizerScannerAssignmentSchema = z.object({
  event_id: z.number().int(),
});

export type OrganizerScannerAssignment = z.infer<typeof organizerScannerAssignmentSchema>;

/** POST /api/v1/organizer/events/{eventId}/scanner-assignments */
export const organizerEventScannerAssignmentsSchema = z.object({
  scanner_account_ids: z.array(z.number().int()).min(1),
  gate_label: z.string().max(160).optional(),
});

export type OrganizerEventScannerAssignments = z.infer<typeof organizerEventScannerAssignmentsSchema>;
