import { z } from 'zod';

/** GET /api/v1/main/events/categories — public list for event editor dropdown. */
export const eventCategoriesEnvelopeSchema = z.object({
  data: z.array(
    z.object({
      id: z.union([z.number(), z.string()]),
      slug: z.string().optional(),
      name: z.string(),
      name_ar: z.string().optional(),
      events_count: z.number().optional(),
    })
  ),
});

export type EventCategoryRow = z.infer<typeof eventCategoriesEnvelopeSchema>['data'][number];
