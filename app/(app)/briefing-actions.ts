'use server';

import { revalidatePath } from 'next/cache';

import type { ActionablePayload } from '@/lib/agents/types';
import { requireOnboardedUser } from '@/lib/auth/session';
import { actionError, actionSuccess, type ActionResult } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';

/**
 * Beslist een AI-voorstel (BR-702: menselijke goedkeuring, ADR-012 §7 Approval
 * Handler). Twee stappen, nooit één: (1) `decide_agent_proposal()`-RPC
 * (022_agent_pipeline.sql) legt de beslissing zelf vast met een
 * state-transition-guard (kan een voorstel niet twee keer behandelen); (2) bij
 * "approved" op een uitvoerbaar voorstel (`payload` aanwezig) voert deze
 * Server Action de bijbehorende actie uit via bestaande, ongewijzigde Edge
 * Functions (route-optimize/route-move-job) — nooit een nieuw schrijfpad
 * (ADR-011 §7). Een informatief voorstel (Capacity/Weather, `payload: null`)
 * heeft na stap 1 niets meer te doen.
 */

interface EdgeFunctionError {
  code: string;
  message: string;
  hint?: string;
}

export async function decideProposal(
  proposalId: string,
  decision: 'approved' | 'rejected',
): Promise<ActionResult<{ executed: boolean }>> {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { data: proposal, error: decideError } = await supabase.rpc('decide_agent_proposal', {
    p_proposal_id: proposalId,
    p_approval_status: decision,
  });

  if (decideError || !proposal) {
    return actionError({
      code: decideError?.code ?? 'decide_failed',
      message: 'Voorstel kon niet worden bijgewerkt — mogelijk is het al behandeld.',
    });
  }

  let executed = false;
  const payload = proposal.payload as ActionablePayload | null;

  if (decision === 'approved' && payload?.type === 'route_optimize') {
    const { data, error } = await supabase.functions.invoke<
      { route: unknown } | { error: EdgeFunctionError }
    >('route-optimize', {
      body: { employee_id: payload.employeeId, date: payload.date },
    });

    if (error || !data || 'error' in data) {
      const edgeError = data && 'error' in data ? data.error : null;
      if (!edgeError) {
        logger.error('decideProposal: route-optimize onbereikbaar', { message: error?.message });
      }
      return actionError({
        code: edgeError?.code ?? 'execution_failed',
        message:
          edgeError?.message ??
          'Voorstel is geaccepteerd, maar uitvoeren is mislukt. Probeer het opnieuw via de planner.',
      });
    }
    executed = true;
  }

  // Replanning Agent (43_AI_Agents.md § 5, Sprint 7-vervolg, BR-802): elke
  // move wordt via de bestaande route-move-job-Edge-Function uitgevoerd (geen
  // nieuwe verplaatsingslogica, ADR-011 §7). Faalt één move, dan blijven de
  // overige gewoon uitgevoerd — een gedeeltelijk succesvolle herplanning is
  // beter dan een all-or-nothing-rollback die de planner terug bij af zet
  // (ADR-012 §4: "de app blijft altijd bruikbaar").
  if (decision === 'approved' && payload?.type === 'replan_jobs') {
    let succeeded = 0;
    const failedJobIds: string[] = [];

    for (const move of payload.moves) {
      const { data, error } = await supabase.functions.invoke<
        { success: true } | { error: EdgeFunctionError }
      >('route-move-job', {
        body: { job_id: move.jobId, target_route_id: move.targetRouteId, position: move.position },
      });

      if (error || !data || 'error' in data) {
        failedJobIds.push(move.jobId);
        const edgeError = data && 'error' in data ? data.error : null;
        logger.error('decideProposal: route-move-job mislukt tijdens herplanning', {
          jobId: move.jobId,
          message: edgeError?.message ?? error?.message,
        });
        continue;
      }
      succeeded += 1;
    }

    if (payload.unplaceableJobIds.length > 0) {
      // Onplaatsbare beurten gaan naar de herplan-wachtrij (BR-015-precedent:
      // status 'rescheduling', geen route) — planner behandelt ze handmatig.
      const { error: queueError } = await supabase
        .from('jobs')
        .update({ status: 'rescheduling', route_id: null })
        .in('id', payload.unplaceableJobIds);
      if (queueError) {
        logger.error('decideProposal: kon onplaatsbare beurten niet naar wachtrij zetten', {
          message: queueError.message,
        });
      }
    }

    executed = succeeded > 0 || payload.unplaceableJobIds.length > 0;

    if (failedJobIds.length > 0) {
      revalidatePath('/');
      revalidatePath('/planning');
      revalidatePath('/planning/wachtrij');
      return actionError({
        code: 'partial_execution_failed',
        message: `${succeeded} van ${payload.moves.length} beurten verplaatst; ${failedJobIds.length} kon(den) niet worden verplaatst. Controleer de planner.`,
      });
    }
  }

  revalidatePath('/');
  revalidatePath('/planning');
  revalidatePath('/planning/wachtrij');
  return actionSuccess({ executed });
}
