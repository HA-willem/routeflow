import { z } from 'zod';

/**
 * FR-068/BR-020: creditfactuur-regels. `amountEuros` is het positieve,
 * excl.-BTW-bedrag dat gecrediteerd wordt — create_credit_invoice()
 * (035_invoice_credit_notes.sql) negeert dit intern (credit = negatief).
 */
export const creditInvoiceSchema = z.object({
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1, 'Vul een omschrijving in.'),
        amountEuros: z.number().positive('Bedrag moet groter dan 0 zijn.'),
        vatRate: z.number().refine((value) => [0, 9, 21].includes(value), {
          message: 'Kies een geldig BTW-tarief (0%, 9% of 21%).',
        }),
      }),
    )
    .min(1, 'Selecteer of vul minimaal één regel in om te crediteren.'),
  note: z.string().trim().optional(),
});

export type CreditInvoiceInput = z.infer<typeof creditInvoiceSchema>;
