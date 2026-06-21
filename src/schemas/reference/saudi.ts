import { z } from 'zod';

const idLike = z.union([z.number().int(), z.string().min(1)]);

const localizedNameFields = {
  name: z.string(),
  name_en: z.string().optional(),
  name_ar: z.string().optional(),
};

export const saudiRefCityNestedSchema = z.object({
  id: idLike,
  ...localizedNameFields,
});

export const saudiRefRegionRowSchema = z.object({
  id: idLike,
  code: z.string().optional(),
  ...localizedNameFields,
  cities: z.array(saudiRefCityNestedSchema).optional(),
});

export const saudiRegionsEnvelopeSchema = z.object({
  data: z.array(saudiRefRegionRowSchema),
});

export const saudiRefCityFlatSchema = z.object({
  id: idLike,
  ...localizedNameFields,
  region_id: idLike,
});

export const saudiCitiesEnvelopeSchema = z.object({
  data: z.array(saudiRefCityFlatSchema),
});

export type SaudiRefRegionRow = z.infer<typeof saudiRefRegionRowSchema>;
export type SaudiRefCityFlat = z.infer<typeof saudiRefCityFlatSchema>;
