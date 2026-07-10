import { z } from 'zod';

/**
 * Combineert Dienstafspraak + Prijsafspraak in één formulier-schema (1:1-relatie,
 * 18_Prijsafspraken.md § 2: "gekoppeld aan een Dienstafspraak"; samen aangemaakt,
 * zie service-agreements/actions.ts). MVP-fase (18_Prijsafspraken.md § 1): alleen
 * `per_job`/`hourly` zijn hier kiesbaar — `subscription` (V1) en `punch_card` (V2)
 * bestaan al in het DB-schema (007_pricings.sql) maar krijgen pas een UI-optie
 * wanneer die fases aan de beurt zijn.
 *
 * Net als bij lib/validation/service.ts blijven numerieke velden hier plain
 * `z.number()` (geen coerce/pipe) om het react-hook-form-type simpel te houden;
 * de euro→cent-omzetting gebeurt in de Server Action.
 */
export const serviceAgreementSchema = z
  .object({
    serviceId: z.string().trim().min(1, 'Kies een dienst.'),
    frequencyType: z.enum(
      ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'once', 'custom'],
      { message: 'Kies een frequentie.' },
    ),
    customIntervalDays: z
      .number()
      .int()
      .min(7, 'Aangepaste frequentie moet minimaal 7 dagen zijn.')
      .max(365, 'Aangepaste frequentie mag maximaal 365 dagen zijn.')
      .optional(),
    preferredDay: z.number().int().min(0).max(6).optional(),
    preferredDaypart: z.enum(['morning', 'afternoon']).optional(),
    flexibilityWindowDays: z
      .number()
      .int()
      .min(0, 'Flexibiliteitsvenster kan niet negatief zijn.')
      .max(21, 'Flexibiliteitsvenster mag maximaal 21 dagen zijn.'),
    callAheadRequired: z.boolean(),
    pricingType: z.enum(['per_job', 'hourly'], { message: 'Kies een prijstype.' }),
    amountEuros: z.number().min(0, 'Bedrag kan niet negatief zijn.').optional(),
    hourlyRateEuros: z.number().min(0, 'Uurtarief kan niet negatief zijn.').optional(),
    vatRate: z.number().refine((value) => [0, 9, 21].includes(value), {
      message: 'Kies een geldig BTW-tarief (0%, 9% of 21%).',
    }),
  })
  .refine((data) => data.frequencyType !== 'custom' || data.customIntervalDays !== undefined, {
    message: 'Vul het aantal dagen in voor een aangepaste frequentie.',
    path: ['customIntervalDays'],
  })
  .refine((data) => data.pricingType !== 'per_job' || data.amountEuros !== undefined, {
    message: 'Vul het bedrag per beurt in.',
    path: ['amountEuros'],
  })
  .refine((data) => data.pricingType !== 'hourly' || data.hourlyRateEuros !== undefined, {
    message: 'Vul het uurtarief in.',
    path: ['hourlyRateEuros'],
  });

export type ServiceAgreementInput = z.infer<typeof serviceAgreementSchema>;

/**
 * FR-005: pauzeerdatum mag niet in het verleden liggen. Vergelijkt als kale
 * ISO-datumstrings (niet via `Date`-parsing) omdat `new Date('YYYY-MM-DD')`
 * als UTC-middernacht parseert terwijl `new Date().toDateString()` lokale
 * middernacht geeft — in tijdzones ten westen van UTC (bv. Amerika) laat dat
 * "vandaag" onterecht als verleden tijd tellen. ISO-datumstrings vergelijken
 * lexicografisch correct chronologisch.
 */
export const pauseServiceAgreementSchema = z.object({
  pausedUntil: z.string().refine((value) => value >= new Date().toISOString().slice(0, 10), {
    message: 'De pauzeerdatum mag niet in het verleden liggen.',
  }),
});

/** BR-102/FR-004: alleen weekly/biweekly/custom hebben een vaste dag-interval. */
export function frequencyIntervalDays(
  frequencyType: ServiceAgreementInput['frequencyType'],
  customIntervalDays: number | undefined,
): number | null {
  switch (frequencyType) {
    case 'weekly':
      return 7;
    case 'biweekly':
      return 14;
    case 'custom':
      return customIntervalDays ?? null;
    default:
      return null;
  }
}
