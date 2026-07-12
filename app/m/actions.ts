'use server';

import { revalidatePath } from 'next/cache';

import { requireOnboardedUser } from '@/lib/auth/session';
import { actionError, actionSuccess, type ActionResult } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

/**
 * Server Actions voor de PWA-uitvoeringsflow (29_MobieleApp.md § 2.2/2.3).
 * De logica zelf staat in de gelijknamige Postgres-RPC's
 * (020_job_completion.sql) — hier alleen auth, doorgifte en het uniforme
 * foutmodel, zelfde patroon als app/(app)/planning/actions.ts
 * (41_CodingStandards.md § 7).
 */

type Job = Database['public']['Tables']['jobs']['Row'];

function mapRpcError(context: string, error: { message: string; code?: string } | null) {
  logger.error(`${context} mislukt`, { message: error?.message });
  return actionError({
    code: error?.code ?? 'action_failed',
    message: 'Actie kon niet worden uitgevoerd. Probeer het opnieuw.',
  });
}

export async function startJob(jobId: string): Promise<ActionResult<Job>> {
  await requireOnboardedUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('start_job', { p_job_id: jobId }).single();
  if (error || !data) return mapRpcError('startJob', error);
  revalidatePath('/m');
  revalidatePath(`/m/beurt/${jobId}`);
  return actionSuccess(data);
}

export async function pauseJob(jobId: string): Promise<ActionResult<Job>> {
  await requireOnboardedUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('pause_job', { p_job_id: jobId }).single();
  if (error || !data) return mapRpcError('pauseJob', error);
  revalidatePath(`/m/beurt/${jobId}`);
  return actionSuccess(data);
}

export async function resumeJob(jobId: string): Promise<ActionResult<Job>> {
  await requireOnboardedUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('resume_job', { p_job_id: jobId }).single();
  if (error || !data) return mapRpcError('resumeJob', error);
  revalidatePath(`/m/beurt/${jobId}`);
  return actionSuccess(data);
}

export async function completeJob(
  jobId: string,
  notes?: string,
): Promise<ActionResult<{ job: Job; invoiceId: string }>> {
  await requireOnboardedUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('complete_job', { p_job_id: jobId, ...(notes ? { p_notes: notes } : {}) })
    .single();
  if (error || !data) return mapRpcError('completeJob', error);

  const result = data as unknown as { job: Job; invoice: { id: string } };
  revalidatePath('/m');
  revalidatePath(`/m/beurt/${jobId}`);
  return actionSuccess({ job: result.job, invoiceId: result.invoice.id });
}

export async function markJobNotHome(jobId: string, reason?: string): Promise<ActionResult<Job>> {
  await requireOnboardedUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('mark_job_not_home', { p_job_id: jobId, ...(reason ? { p_reason: reason } : {}) })
    .single();
  if (error || !data) return mapRpcError('markJobNotHome', error);
  revalidatePath('/m');
  revalidatePath(`/m/beurt/${jobId}`);
  return actionSuccess(data);
}

/**
 * Registreert een reeds geüploade foto (client uploadt rechtstreeks naar
 * Storage — de Server Action doet alleen de metadata-insert, zelfde
 * verantwoordelijkheidsverdeling als 015_job_photos_storage.sql voorschrijft:
 * grote binaries gaan niet door de Server Action heen).
 */
export async function recordJobPhoto(params: {
  jobId: string;
  storagePath: string;
  type: 'before' | 'after';
}): Promise<ActionResult<{ id: string }>> {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_photos')
    .insert({
      company_id: profile.company_id,
      job_id: params.jobId,
      storage_path: params.storagePath,
      type: params.type,
    })
    .select('id')
    .single();

  if (error || !data) {
    logger.error('recordJobPhoto mislukt', { message: error?.message });
    return actionError({
      code: error?.code ?? 'photo_record_failed',
      message: 'Foto kon niet worden geregistreerd.',
    });
  }

  revalidatePath(`/m/beurt/${params.jobId}`);
  return actionSuccess(data);
}
