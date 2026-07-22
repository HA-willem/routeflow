'use server';

import { revalidatePath } from 'next/cache';

import { requireOnboardedUser } from '@/lib/auth/session';
import { actionError, actionSuccess, type ActionResult } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

// Geen @/app/*-padalias (tsconfig.json § paths) — relatief pad naar de
// bestaande sendInvoice() (FR-069, hergebruikt i.p.v. gedupliceerd).
import { sendInvoice } from '../(app)/facturen/actions';

/** Rollen die zelf al facturen mogen versturen (23_Gebruikersrollen.md § 2, FR-069 AC4). */
const INVOICE_SENDING_ROLES: Database['public']['Enums']['user_role'][] = [
  'owner',
  'admin',
  'administration',
];

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

/**
 * FR-069 (ZZP-versnelling, PRD § 19 A-33): als het bedrijf
 * `instant_invoice_on_complete` aan heeft staan én de afrondende gebruiker
 * zelf al facturen mag versturen (23_Gebruikersrollen.md § 2), wordt de
 * conceptfactuur meteen ook verstuurd — dezelfde bestaande `sendInvoice()`
 * (app/(app)/facturen/actions.ts), alleen automatisch aangeroepen i.p.v. via
 * een los scherm. Blijft binnen BR-702: het is nog altijd een user-
 * geïnitieerde actie ("Gereed"), niet een systeemtrigger zonder mens.
 * Best-effort: als versturen mislukt (bv. ontbrekende factuurgegevens),
 * blijft de beurt gewoon afgerond en de factuur een concept — geen foutmelding
 * die de succesvolle afronding zelf overschaduwt.
 */
export async function completeJob(
  jobId: string,
  notes?: string,
): Promise<ActionResult<{ job: Job; invoiceId: string; invoiceSent: boolean }>> {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc('complete_job', { p_job_id: jobId, ...(notes ? { p_notes: notes } : {}) })
    .single();
  if (error || !data) return mapRpcError('completeJob', error);

  const result = data as unknown as { job: Job; invoice: { id: string } | null };
  revalidatePath('/m');
  revalidatePath(`/m/beurt/${jobId}`);

  let invoiceSent = false;
  const invoiceId = result.invoice?.id;
  if (invoiceId && INVOICE_SENDING_ROLES.includes(profile.role)) {
    const { data: company } = await supabase
      .from('companies')
      .select('instant_invoice_on_complete')
      .eq('id', profile.company_id)
      .single();
    if (company?.instant_invoice_on_complete) {
      const sendResult = await sendInvoice(invoiceId);
      invoiceSent = sendResult.success;
    }
  }

  return actionSuccess({ job: result.job, invoiceId: invoiceId ?? '', invoiceSent });
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
