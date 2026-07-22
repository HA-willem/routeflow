import { z } from 'zod';

/** AI-assistent-instellingen (automatiseringsniveau/confidence-drempel per agent). */
export const agentSettingSchema = z.object({
  agent: z.enum(['planning', 'replanning', 'weather', 'capacity', 'optimization', 'invoice']),
  automationLevel: z.enum(['proposal', 'semi_automatic', 'fully_automatic']),
  confidenceThreshold: z.number().min(0, 'Minimaal 0.').max(1, 'Maximaal 1.'),
});

export const agentSettingsFormSchema = z.object({
  settings: z.array(agentSettingSchema).min(1),
});

export type AgentSettingInput = z.infer<typeof agentSettingSchema>;
export type AgentSettingsFormInput = z.infer<typeof agentSettingsFormSchema>;
