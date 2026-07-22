import { z } from 'zod';

import { INDUSTRIES } from '@/lib/branche-templates/data';

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

/**
 * Bedrijfsinstellingen (FR-100, PRD § 19 A-33) — combineert de al sinds A-20
 * bestaande, tot nu toe UI-loze `config_json.invoicing`-velden met de nieuwe
 * FR-100 AC4/AC5-velden (company_type/industry, echte kolommen, 041_company_type_industry.sql)
 * en de FR-069-toggle. Bewust géén logo/primaire-kleur (FR-100 AC2) in deze
 * eerste versie — dat is white-label-branding (file-upload/kleurkiezer,
 * raakt PDF-/e-mail-templates), een materieel andere, grotere feature dan de
 * rest van deze sprint; expliciete scope-cut, geen vergeten AC.
 */
export const companySettingsSchema = z.object({
  name: z.string().trim().min(1, 'Vul een bedrijfsnaam in.').max(255),
  companyType: z.enum(['zzp', 'mkb']).optional(),
  industry: z
    .string()
    .refine((value) => INDUSTRIES.some((industry) => industry.id === value), {
      message: 'Kies een geldige branche.',
    })
    .optional()
    .or(z.literal('').transform(() => undefined)),
  instantInvoiceOnComplete: z.boolean(),
  companyCode: optionalTrimmed(20),
  kvkNumber: optionalTrimmed(20),
  vatNumber: optionalTrimmed(30),
  iban: optionalTrimmed(34),
  bic: optionalTrimmed(11),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
