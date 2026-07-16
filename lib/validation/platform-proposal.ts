import { z } from 'zod';

/**
 * PlatformProposalForm-schema — 46_PlatformAdmin.md § 3.3/"Volgende stap".
 * Sprint 11: handmatig aangemaakt door de platform-admin (nog geen
 * geautomatiseerde Product Agent-run, zie Sprint 11-vervolg).
 */
export const platformProposalSchema = z.object({
  title: z.string().trim().min(1, 'Vul een titel in.').max(200),
  prUrl: z
    .string()
    .trim()
    .url('Voer een geldige URL in.')
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  triggerSummary: z.string().trim().min(1, 'Vul toe waarom dit voorstel er is.').max(2000),
  riskLevel: z.enum(['normal', 'high_risk']),
  alternativesConsidered: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal('').transform(() => '')),
});

export type PlatformProposalInput = z.infer<typeof platformProposalSchema>;
