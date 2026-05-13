import { z } from 'zod';

const idLike = z.union([z.number().int(), z.string().min(1)]);

export const saudiRefCityNestedSchema = z.object({
  id: idLike,
  name: z.string(),
});

export const saudiRefRegionRowSchema = z.object({
  id: idLike,
  name: z.string(),
  cities: z.array(saudiRefCityNestedSchema).optional(),
});

export const saudiRegionsEnvelopeSchema = z.object({
  data: z.array(saudiRefRegionRowSchema),
});

export const saudiRefCityFlatSchema = z.object({
  id: idLike,
  name: z.string(),
  region_id: idLike,
});

export const saudiCitiesEnvelopeSchema = z.object({
  data: z.array(saudiRefCityFlatSchema),
});

export type SaudiRefRegionRow = z.infer<typeof saudiRefRegionRowSchema>;
export type SaudiRefCityFlat = z.infer<typeof saudiRefCityFlatSchema>;
