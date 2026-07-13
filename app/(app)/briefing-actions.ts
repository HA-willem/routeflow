'use server';

import { revalidatePath } from 'next/cache';

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
 * Server Action de bijbehorende actie uit via de bestaande, ongewijzigde
 * Edge Function (route-optimize) — nooit een nieuw schrijfpad (ADR-011 §7).
 * Een informatief voorstel (Capacity/Weather, `payload: null`) heeft na stap 1
 * niets meer te doen.
 */

interface EdgeFunctionError {
  code: string;
  message: string;
  hint?: string;
}

type RouteOptimizePayload = { type: 'route_optimize'; employeeId: string; date: string };

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
  const payload = proposal.payload as RouteOptimizePayload | null;

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

  revalidatePath('/');
  revalidatePath('/planning');
  return actionSuccess({ executed });
}
