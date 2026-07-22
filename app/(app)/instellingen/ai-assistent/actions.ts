'use server';

import { revalidatePath } from 'next/cache';

import { requireOnboardedUser } from '@/lib/auth/session';
import { actionError, actionSuccess, type ActionResult, validationActionError } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';
import { agentSettingsFormSchema } from '@/lib/validation/agent-settings';

/**
 * AI-assistent-instellingen (15_AIPlanner.md § 8, ADR-012 § 7) — alleen
 * Eigenaar/Admin (042_agent_settings.sql-RLS dwingt dit ook af). Upsert op
 * (company_id, agent): een ontbrekende rij betekent de default
 * (proposal/0.7, lib/agents/approval-handler.ts), dus alleen expliciet
 * afwijkende instellingen hoeven een rij te hebben — maar we schrijven hier
 * gewoon alle zes, dat is eenvoudiger dan diffen tegen de defaults.
 */
export async function updateAgentSettings(input: unknown): Promise<ActionResult<null>> {
  const parsed = agentSettingsFormSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde waarden.');
  }

  const { profile } = await requireOnboardedUser();
  if (!['owner', 'admin'].includes(profile.role)) {
    return actionError({
      code: 'forbidden',
      message: 'Alleen een eigenaar of admin kan de AI-instellingen wijzigen.',
    });
  }

  const supabase = await createClient();

  const { error } = await supabase.from('agent_settings').upsert(
    parsed.data.settings.map((setting) => ({
      company_id: profile.company_id,
      agent: setting.agent,
      automation_level: setting.automationLevel,
      confidence_threshold: setting.confidenceThreshold,
    })),
    { onConflict: 'company_id,agent' },
  );

  if (error) {
    logger.error('updateAgentSettings failed', { code: error.code, companyId: profile.company_id });
    return actionError({
      code: error.code || 'update_agent_settings_failed',
      message: 'De instellingen konden niet worden opgeslagen. Probeer het opnieuw.',
    });
  }

  revalidatePath('/instellingen/ai-assistent');
  return actionSuccess(null);
}
