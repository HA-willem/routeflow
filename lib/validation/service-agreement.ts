import { z } from 'zod';

/**
 * Combineert Dienstafspraak + Prijsafspraak in één formulier-schema (1:1-relatie,
 * 18_Prijsafspraken.md § 2: "gekoppeld aan een Dienstafspraak"; samen aangemaakt,
 * zie service-agreements/actions.ts). Sprint 9 (FR-066) voegt `subscription` toe
 * als derde kiesbare prijstype — `punch_card` (V2) bestaat al in het DB-schema
 * (007_pricings.sql) maar krijgt pas een UI-optie wanneer die fase aan de beurt is.
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
    // .nullable() (i.p.v. alleen .optional()): react-hook-form's Controller valt
    // terug op de geregistreerde defaultValue zodra een veld op `undefined` wordt
    // gezet (het kan "nooit ingevuld" en "expliciet gewist" niet onderscheiden) —
    // `null` is daarom de enige manier om "geen voorkeur" na een eerdere keuze
    // weer daadwerkelijk te laten plakken. Actions/DB blijven ongewijzigd (`?? null`).
    preferredDay: z.number().int().min(0).max(6).nullable().optional(),
    preferredDaypart: z.enum(['morning', 'afternoon']).nullable().optional(),
    flexibilityWindowDays: z
      .number()
      .int()
      .min(0, 'Flexibiliteitsvenster kan niet negatief zijn.')
      .max(21, 'Flexibiliteitsvenster mag maximaal 21 dagen zijn.'),
    callAheadRequired: z.boolean(),
    pricingType: z.enum(['per_job', 'hourly', 'subscription'], { message: 'Kies een prijstype.' }),
    amountEuros: z.number().min(0, 'Bedrag kan niet negatief zijn.').optional(),
    hourlyRateEuros: z.number().min(0, 'Uurtarief kan niet negatief zijn.').optional(),
    // FR-066/BR-304: abonnementsbedrag per maand, aantal inbegrepen beurten
    // (0 = ongelimiteerd, 18_Prijsafspraken.md § 7 foutmelding) en overage-bedrag
    // per beurt daarboven. `billingTiming` (vooraf/achteraf) stuurt de
    // subscription-billing-cron (034_subscription_billing.sql).
    subscriptionAmountEuros: z.number().min(0, 'Bedrag kan niet negatief zijn.').optional(),
    includedJobsPerPeriod: z
      .number()
      .int()
      .min(0, 'Aantal inbegrepen beurten kan niet negatief zijn.')
      .optional(),
    overageAmountEuros: z.number().min(0, 'Overage-bedrag kan niet negatief zijn.').optional(),
    billingTiming: z.enum(['advance', 'arrears']).optional(),
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
  })
  .refine(
    (data) => data.pricingType !== 'subscription' || data.subscriptionAmountEuros !== undefined,
    { message: 'Vul het bedrag per maand in.', path: ['subscriptionAmountEuros'] },
  )
  .refine(
    (data) => data.pricingType !== 'subscription' || data.includedJobsPerPeriod !== undefined,
    {
      message: 'Geef aan hoeveel beurten in het abonnement zitten (0 = ongelimiteerd).',
      path: ['includedJobsPerPeriod'],
    },
  )
  .refine((data) => data.pricingType !== 'subscription' || data.overageAmountEuros !== undefined, {
    message: 'Vul het bedrag per extra beurt boven het abonnement in.',
    path: ['overageAmountEuros'],
  })
  .refine((data) => data.pricingType !== 'subscription' || data.billingTiming !== undefined, {
    message: 'Kies of vooraf of achteraf gefactureerd wordt.',
    path: ['billingTiming'],
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
