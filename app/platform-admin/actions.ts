'use server';

import { revalidatePath } from 'next/cache';

import { actionError, actionSuccess, type ActionResult, validationActionError } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { requirePlatformAdmin } from '@/lib/platform-admin/guard';
import { createClient } from '@/lib/supabase/server';
import { platformProposalSchema } from '@/lib/validation/platform-proposal';

/**
 * Voorstel goedkeuren/afwijzen (BR-901, 46_PlatformAdmin.md § 4) — "approved"
 * betekent uitsluitend "deze PR mag gemerged worden"; de merge zelf is een
 * losse, handmatige git-actie (markPlatformProposalMerged hieronder is puur
 * boekhouding achteraf, voert zelf geen merge uit).
 */
export async function decidePlatformProposal(
  proposalId: string,
  decision: 'approved' | 'rejected',
): Promise<ActionResult<null>> {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc('decide_platform_proposal', {
    p_proposal_id: proposalId,
    p_status: decision,
  });

  if (error) {
    logger.error('decidePlatformProposal failed', { code: error.code, proposalId });
    return actionError({
      code: error.code || 'decide_proposal_failed',
      message: 'Voorstel kon niet worden bijgewerkt — mogelijk is het al behandeld.',
    });
  }

  revalidatePath('/platform-admin');
  return actionSuccess(null);
}

/** Registreert dat een goedgekeurd voorstel daadwerkelijk gemerged is (buiten de app om, in git). */
export async function markPlatformProposalMerged(proposalId: string): Promise<ActionResult<null>> {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc('mark_platform_proposal_merged', {
    p_proposal_id: proposalId,
  });

  if (error) {
    logger.error('markPlatformProposalMerged failed', { code: error.code, proposalId });
    return actionError({
      code: error.code || 'mark_merged_failed',
      message: 'Kon niet registreren als gemerged — mogelijk is het voorstel nog niet goedgekeurd.',
    });
  }

  revalidatePath('/platform-admin');
  return actionSuccess(null);
}

/**
 * Handmatig een voorstel aanmaken (Sprint 11-fundament, 46_PlatformAdmin.md
 * "Volgende stap": de geautomatiseerde Product Agent-run volgt in Sprint
 * 11-vervolg — tot die tijd is dit het enige aanmaakpad, altijd door een
 * platform-admin zelf).
 */
export async function createPlatformProposal(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = platformProposalSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  await requirePlatformAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('platform_proposals')
    .insert({
      title: parsed.data.title,
      pr_url: parsed.data.prUrl ?? null,
      trigger_summary: parsed.data.triggerSummary,
      risk_level: parsed.data.riskLevel,
      alternatives_considered: parsed.data.alternativesConsidered ?? '',
    })
    .select('id')
    .single();

  if (error || !data) {
    logger.error('createPlatformProposal failed', { code: error?.code });
    return actionError({
      code: error?.code || 'create_proposal_failed',
      message: 'Voorstel kon niet worden aangemaakt. Probeer het opnieuw.',
    });
  }

  revalidatePath('/platform-admin');
  return actionSuccess({ id: data.id });
}

/** Feature request afwijzen vanuit het portal (triage, 46_PlatformAdmin.md § 2.3). */
export async function rejectFeatureRequest(featureRequestId: string): Promise<ActionResult<null>> {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('feature_requests')
    .update({ status: 'afgewezen' })
    .eq('id', featureRequestId);

  if (error) {
    logger.error('rejectFeatureRequest failed', { code: error.code, featureRequestId });
    return actionError({
      code: error.code || 'reject_feature_request_failed',
      message: 'Kon de feature request niet afwijzen. Probeer het opnieuw.',
    });
  }

  revalidatePath('/platform-admin');
  return actionSuccess(null);
}

/**
 * Feature request handmatig accepteren (→ 'gepland') vanuit het portal.
 * Tijdelijk handmatig triage-pad zolang de Product Agent-triage (FR-951,
 * Sprint 11-vervolg) nog niet gebouwd is — normaal loopt "goedkeuren" via
 * een concreet Product Agent-voorstel (getrieerd → voorgesteld), maar die
 * stap bestaat nog niet.
 */
export async function acceptFeatureRequest(featureRequestId: string): Promise<ActionResult<null>> {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('feature_requests')
    .update({ status: 'gepland' })
    .eq('id', featureRequestId);

  if (error) {
    logger.error('acceptFeatureRequest failed', { code: error.code, featureRequestId });
    return actionError({
      code: error.code || 'accept_feature_request_failed',
      message: 'Kon de feature request niet accepteren. Probeer het opnieuw.',
    });
  }

  revalidatePath('/platform-admin');
  return actionSuccess(null);
}
