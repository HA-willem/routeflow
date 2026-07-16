import { z } from 'zod';

/** FeatureRequestForm-schema — 46_PlatformAdmin.md § 2.1, FR-950. */
export const featureRequestSchema = z.object({
  title: z.string().trim().min(1, 'Vul een titel in.').max(200),
  description: z.string().trim().min(1, 'Vul een omschrijving in.').max(5000),
  context: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type FeatureRequestInput = z.infer<typeof featureRequestSchema>;
