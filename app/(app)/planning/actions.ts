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

/**
 * Verplaatst een beurt naar een (medewerker, datum)-combinatie i.p.v. een
 * bekende `targetRouteId` — nodig voor de ZZP-weekweergave (WeekBoard) waar
 * een dagkolom nog geen route heeft zolang er niets naartoe gesleept is
 * (`routes` heeft dan gewoonweg nog geen rij, RLS: alleen owner/admin/planner
 * mag er een aanmaken, 003_rls_baseline.sql-precedent). Maakt de route lazy
 * aan via het gewone RLS-pad (niet de service-rol) en hergebruikt daarna
 * exact dezelfde `moveJob` — geen tweede uitvoerpad naast route-move-job.
 */
export async function moveJobToDate(params: {
  jobId: string;
  employeeId: string;
  targetDate: string;
  position: number;
}): Promise<ActionResult<MoveJobResult>> {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data: existingRoute } = await supabase
    .from('routes')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('employee_id', params.employeeId)
    .eq('route_date', params.targetDate)
    .maybeSingle();

  let targetRouteId = existingRoute?.id ?? null;
  if (!targetRouteId) {
    const { data: created, error: createError } = await supabase
      .from('routes')
      .insert({
        company_id: profile.company_id,
        employee_id: params.employeeId,
        route_date: params.targetDate,
      })
      .select('id')
      .single();
    if (createError || !created) {
      logger.error('moveJobToDate: route aanmaken mislukt', { message: createError?.message });
      return actionError({
        code: createError?.code ?? 'route_create_failed',
        message: 'Kon geen route aanmaken voor deze dag. Probeer het opnieuw.',
      });
    }
    targetRouteId = created.id;
  }

  return moveJob({ jobId: params.jobId, targetRouteId, position: params.position });
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
