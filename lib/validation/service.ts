import { z } from 'zod';

/**
 * Numerieke velden zijn hier bewust plain `z.number()` (geen `z.coerce`/`.pipe()`
 * transforms): react-hook-form + zodResolver vereisen dat het form-state-type
 * (TFieldValues) en het gevalideerde output-type gelijk zijn bij één generic op
 * useForm(). De euro→cent-omzetting gebeurt daarom in de Server Action, niet in
 * dit schema; de <Input type="number">-velden zetten zelf string → number om
 * (zie ServiceForm.tsx, analoog aan CustomerForm.tsx paymentTermsDays).
 */
export const serviceSchema = z
  .object({
    name: z.string().trim().min(1, 'Vul een naam in.').max(255),
    description: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    standardDurationMinutes: z
      .number()
      .int()
      .min(15, 'Duur moet minimaal 15 minuten zijn.')
      .max(480, 'Duur mag maximaal 480 minuten zijn.'),
    standardPriceEuros: z.number().min(0, 'Bedrag kan niet negatief zijn.'),
    vatRate: z.number().refine((value) => [0, 9, 21].includes(value), {
      message: 'Kies een geldig BTW-tarief (0%, 9% of 21%).',
    }),
    isWeatherSensitive: z.boolean(),
    weatherSensitivityType: z.enum(['rain', 'frost', 'wind']).optional(),
    icon: z
      .string()
      .trim()
      .max(50)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    colorHex: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Voer een geldige kleurcode in (bijv. #1A73E8).')
      .optional()
      .or(z.literal('').transform(() => undefined)),
  })
  .refine((data) => !data.isWeatherSensitive || !!data.weatherSensitivityType, {
    message: 'Kies een weerstype voor een weersgevoelige dienst.',
    path: ['weatherSensitivityType'],
  });

export type ServiceInput = z.infer<typeof serviceSchema>;
