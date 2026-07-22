import { z } from 'zod';

import { INDUSTRIES } from '@/lib/branche-templates/data';

/** Branche-dienstensjabloon importeren (FR-104). */
export const importBrancheTemplateSchema = z.object({
  industryId: z.string().refine((value) => INDUSTRIES.some((industry) => industry.id === value), {
    message: 'Kies een geldige branche.',
  }),
  serviceNames: z.array(z.string()).min(1, 'Selecteer minstens één dienst om te importeren.'),
});

export type ImportBrancheTemplateInput = z.infer<typeof importBrancheTemplateSchema>;
