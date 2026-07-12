'use server';

import { revalidatePath } from 'next/cache';

import { requireOnboardedUser } from '@/lib/auth/session';
import { actionError, actionSuccess, type ActionResult } from '@/lib/errors';
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
