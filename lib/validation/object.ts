import { z } from 'zod';

/** NL-postcode: 4 cijfers + 2 letters, bijv. "1234 AB" (12_Entiteiten.md § 4, Sprint 2-fix). */
const nlPostalCodeRegex = /^[1-9][0-9]{3}\s?[A-Z]{2}$/;

export const objectSchema = z.object({
  addressLine1: z.string().trim().min(1, 'Vul een adres in.').max(255),
  addressLine2: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  postalCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => nlPostalCodeRegex.test(value), {
      message: 'Voer een geldige postcode in (bijv. 1234 AB).',
    }),
  city: z.string().trim().min(1, 'Vul een plaats in.').max(100),
  countryCode: z.literal('NL'),
  type: z.enum(['residence', 'commercial', 'complex', 'other'], {
    message: 'Kies een objecttype.',
  }),
  accessNotes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type ObjectInput = z.infer<typeof objectSchema>;
