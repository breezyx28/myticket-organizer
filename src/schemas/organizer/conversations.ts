import { z } from 'zod';

export const createConversationSchema = z.object({
  target_type: z.enum(['talent', 'vendor']),
  target_id: z.number().int().positive(),
  topic: z.string().max(255).optional(),
  brief: z.string().max(2000).optional(),
  event_id: z.number().int().positive().optional(),
});

export type CreateConversationBody = z.infer<typeof createConversationSchema>;

export const postConversationMessageSchema = z.object({
  body: z.string().min(1).max(5000),
  attachment_url: z.string().url().max(500).optional(),
});

export type PostConversationMessageBody = z.infer<typeof postConversationMessageSchema>;
