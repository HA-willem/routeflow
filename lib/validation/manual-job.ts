import { z } from 'zod';

/**
 * FR-029: handmatige beurt-toevoeging op dag/tijdstip. Precies één van
 * `serviceAgreementId` (bestaande dienstafspraak) of `newService` (inline
 * eenmalige dienstafspraak, AC2) moet gekozen zijn — nooit een beurt zonder
 * onderliggende dienstafspraak (bestaand domeinmodel, FR-003).
 */
export const manualJobSchema = z
  .object({
    objectId: z.string().trim().min(1, 'Kies een object.'),
    serviceAgreementId: z.string().trim().min(1).nullable(),
    newService: z
      .object({
        serviceId: z.string().trim().min(1, 'Kies een dienst.'),
        pricingType: z.enum(['per_job', 'hourly'], { message: 'Kies een prijstype.' }),
        amountEuros: z.number().min(0, 'Bedrag kan niet negatief zijn.').optional(),
        hourlyRateEuros: z.number().min(0, 'Uurtarief kan niet negatief zijn.').optional(),
        vatRate: z.number().refine((value) => [0, 9, 21].includes(value), {
          message: 'Kies een geldig BTW-tarief (0%, 9% of 21%).',
        }),
      })
      .nullable(),
    employeeId: z.string().trim().min(1, 'Kies een medewerker.'),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Kies een geldige datum.'),
    scheduledTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Kies een geldig tijdstip (uu:mm).'),
    note: z
      .string()
      .trim()
      .min(1, 'Vul een toelichting in (bijv. "Klant alleen dinsdag 14:00 bereikbaar").')
      .max(255, 'Toelichting mag maximaal 255 tekens zijn.'),
  })
  .refine((data) => Boolean(data.serviceAgreementId) !== Boolean(data.newService), {
    message: 'Kies een bestaande dienstafspraak óf maak een nieuwe eenmalige afspraak aan.',
    path: ['serviceAgreementId'],
  })
  .refine(
    (data) =>
      data.newService?.pricingType !== 'per_job' || data.newService.amountEuros !== undefined,
    {
      message: 'Vul het bedrag per beurt in.',
      path: ['newService', 'amountEuros'],
    },
  )
  .refine(
    (data) =>
      data.newService?.pricingType !== 'hourly' || data.newService.hourlyRateEuros !== undefined,
    {
      message: 'Vul het uurtarief in.',
      path: ['newService', 'hourlyRateEuros'],
    },
  );

export type ManualJobInput = z.infer<typeof manualJobSchema>;
