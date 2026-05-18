import { z } from 'zod';
import { laravelPaginatorShellSchema } from '@/schemas/organizer/responses/shared';

export const adminEventNotificationActionSchema = z.enum([
  'approved',
  'rejected',
  'featured',
  'unfeatured',
  'pinned',
  'unpinned',
]);

export const adminEventNotificationDataSchema = z
  .object({
    admin_action: adminEventNotificationActionSchema,
    event_id: z.coerce.number(),
    event_code: z.string(),
    status: z.string(),
    rejection_reason: z.string().optional(),
  })
  .passthrough();

export const notificationRowSchema = z
  .object({
    id: z.coerce.number(),
    user_id: z.coerce.number().optional(),
    kind: z.string(),
    title: z.string(),
    body: z.string().nullable().optional(),
    href: z.string().nullable().optional(),
    data: z.union([adminEventNotificationDataSchema, z.record(z.unknown()), z.null()]).optional(),
    related_entity_type: z.string().nullable().optional(),
    related_entity_id: z.coerce.number().nullable().optional(),
    is_read: z.boolean(),
    read_at: z.string().nullable().optional(),
    archived_at: z.string().nullable().optional(),
    created_at: z.string(),
  })
  .passthrough();

export const notificationsListResponseSchema = laravelPaginatorShellSchema.extend({
  unread_count: z.coerce.number().optional(),
});
