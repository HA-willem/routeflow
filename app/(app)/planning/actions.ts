'use server';

import { revalidatePath } from 'next/cache';

import { requireOnboardedUser } from '@/lib/auth/session';
import { actionError, actionSuccess, mapPostgresError, type ActionResult } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';

/**
 * Server Actions rond de routing-Edge-Functions (41_CodingStandards.md § 7:
 * "Server Action is de dunne UI-schil, de Edge Function bevat de daadwerkelijke
 * logica"). De eigenlijke optimalisatie/verplaatsing-logica staat in
 * supabase/functions/route-optimize en route-move-job (ADR-008) — hier alleen
 * auth, input-doorgifte en het uniforme foutmodel (lib/errors.ts).
 */

interface EdgeFunctionError {
  code: string;
  message: string;
  hint?: string;
  status?: number;
}

interface MoveJobResult {
  success: true;
}

interface OptimizeResult {
  route: { id: string } | null;
  stops: unknown[];
  unplaceable_job_ids: string[];
  message?: string;
}

export async function moveJob(params: {
  jobId: string;
  targetRouteId: string;
  position: number;
}): Promise<ActionResult<MoveJobResult>> {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { data, error } = await supabase.functions.invoke<
    MoveJobResult | { error: EdgeFunctionError }
  >('route-move-job', {
    body: {
      job_id: params.jobId,
      target_route_id: params.targetRouteId,
      position: params.position,
    },
  });

  if (error || !data || 'error' in data) {
    const edgeError = data && 'error' in data ? data.error : null;
    if (!edgeError) {
      logger.error('moveJob: route-move-job onbereikbaar', { message: error?.message });
    }
    return actionError({
      code: edgeError?.code ?? 'move_job_failed',
      message: edgeError?.message ?? 'Beurt kon niet worden verplaatst. Probeer het opnieuw.',
      hint: edgeError?.hint,
    });
  }

  revalidatePath('/planning');
  return actionSuccess(data);
}

export async function optimizeEmployeeDay(params: {
  employeeId: string;
  date: string;
}): Promise<ActionResult<OptimizeResult>> {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { data, error } = await supabase.functions.invoke<
    OptimizeResult | { error: EdgeFunctionError }
  >('route-optimize', {
    body: { employee_id: params.employeeId, date: params.date },
  });

  if (error || !data || 'error' in data) {
    const edgeError = data && 'error' in data ? data.error : null;
    if (!edgeError) {
      logger.error('optimizeEmployeeDay: route-optimize onbereikbaar', { message: error?.message });
    }
    return actionError({
      code: edgeError?.code ?? 'optimize_failed',
      message: edgeError?.message ?? 'Route kon niet worden geoptimaliseerd. Probeer het opnieuw.',
      hint: edgeError?.hint,
    });
  }

  revalidatePath('/planning');
  revalidatePath('/planning/wachtrij');
  return actionSuccess(data);
}

interface ReplanningResult {
  proposal_id: string | null;
}

/**
 * Ziek/verlof melden (BR-802, 43_AI_Agents.md § 5, Replanning Agent —
 * Sprint 7-vervolg). Twee stappen, nooit één: (1) legt de afwezigheid vast in
 * `availability` (bestaand schema, geen nieuwe tabel); (2) roept direct
 * agent-replanning aan zodat het herplan-voorstel meteen beschikbaar is,
 * geen wachttijd tot een toekomstige nachtcyclus (ADR-011 § 6: "een
 * user-actie tijdens de dag genereert een gerichte tussentijdse Replanning
 * Agent-aanroep"). `proposal_id: null` is een geldige uitkomst (bv. geen
 * route die dag) — geen fout.
 */
export async function reportSickLeave(params: {
  employeeId: string;
  date: string;
  reason?: string;
}): Promise<ActionResult<ReplanningResult>> {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { error: availabilityError } = await supabase.from('availability').insert({
    company_id: profile.company_id,
    employee_id: params.employeeId,
    date: params.date,
    status: 'sick',
    reason: params.reason ?? null,
  });

  if (availabilityError) {
    return mapPostgresError(
      availabilityError,
      {
        code: 'already_reported',
        message: 'Deze medewerker is al afwezig gemeld op deze datum.',
      },
      {
        code: 'availability_insert_failed',
        message: 'Kon de afwezigheid niet vastleggen. Probeer het opnieuw.',
      },
    );
  }

  const { data, error } = await supabase.functions.invoke<
    ReplanningResult | { error: EdgeFunctionError }
  >('agent-replanning', {
    body: { company_id: profile.company_id, employee_id: params.employeeId, date: params.date },
  });

  if (error || !data || 'error' in data) {
    const edgeError = data && 'error' in data ? data.error : null;
    if (!edgeError) {
      logger.error('reportSickLeave: agent-replanning onbereikbaar', { message: error?.message });
    }
    // Afwezigheid staat al vast; alleen het voorstel kon niet gegenereerd
    // worden — de planner ziet dit terug als een foutmelding, maar de
    // ziekmelding zelf is niet verloren gegaan.
    return actionError({
      code: edgeError?.code ?? 'replanning_failed',
      message:
        edgeError?.message ??
        'Afwezigheid is vastgelegd, maar het herplanvoorstel kon niet worden gegenereerd.',
      hint: edgeError?.hint,
    });
  }

  revalidatePath('/');
  revalidatePath('/planning');
  return actionSuccess(data);
}
