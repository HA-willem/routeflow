import { z } from 'zod';

/**
 * NL-mobiel: 06xxxxxxxx of +316xxxxxxxx (FR-001 AC2). Spaties/koppeltekens worden
 * vóór validatie gestript zodat "06 12 34 56 78" ook geldig is.
 */
const nlMobileRegex = /^(?:\+31|0)6\d{8}$/;
const kvkRegex = /^\d{8}$/;

function stripSeparators(value: string): string {
  return value.replace(/[\s-]/g, '');
}

const optionalNlMobile = z
  .string()
  .trim()
  .transform(stripSeparators)
  .refine((value) => value.length === 0 || nlMobileRegex.test(value), {
    message: 'Voer een geldig NL-mobiel nummer in (06... of +316...).',
  })
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

export const customerSchema = z
  .object({
    name: z.string().trim().min(1, 'Vul een naam in.').max(255),
    type: z.enum(['person', 'business'], { message: 'Kies particulier of zakelijk.' }),
    email: z
      .string()
      .trim()
      .email('Voer een geldig e-mailadres in.')
      .max(255)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    phone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    whatsappNumber: optionalNlMobile,
    whatsappOptIn: z.boolean(),
    emailOptIn: z.boolean(),
    billingPreference: z.enum(['email', 'whatsapp', 'post']),
    kvkNumber: z
      .string()
      .trim()
      .optional()
      .or(z.literal('').transform(() => undefined))
      .refine((value) => value === undefined || kvkRegex.test(value), {
        message: 'KVK-nummer moet uit 8 cijfers bestaan.',
      }),
    vatNumber: z
      .string()
      .trim()
      .max(14, 'BTW-nummer mag maximaal 14 tekens bevatten.')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    paymentTermsDays: z
      .number()
      .int()
      .min(1, 'Betaaltermijn moet minimaal 1 dag zijn.')
      .max(90, 'Betaaltermijn mag maximaal 90 dagen zijn.'),
    notes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .or(z.literal('').transform(() => undefined)),
  })
  .refine((data) => data.type !== 'business' || !!data.kvkNumber, {
    message: 'Vul het KVK-nummer in voor een zakelijke klant.',
    path: ['kvkNumber'],
  });

export type CustomerInput = z.infer<typeof customerSchema>;
