'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireOnboardedUser } from '@/lib/auth/session';
import { actionError, actionSuccess, type ActionResult, validationActionError } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';
import { frequencyIntervalDays, serviceAgreementSchema } from '@/lib/validation/service-agreement';

/**
 * Dienstafspraken-CRUD (FR-004/FR-005). Een Dienstafspraak + zijn Prijsafspraak
 * zijn 1:1 (18_Prijsafspraken.md § 2) en worden hier als twee gewone,
 * sequentiële inserts binnen dezelfde Server Action aangemaakt — geen RPC/Edge
 * Function nodig (41_CodingStandards.md § 7: "eenvoudige CRUD... 1-op-1"): er
 * is geen financiële/gedeelde-state-correctheid die atomiciteit vereist zolang
 * er nog geen facturen bestaan (die landen pas vanaf Sprint 5). Een falende
 * tweede insert laat een ongebruikte, niet-zichtbare pricing-rij achter — geen
 * functioneel of beveiligingsprobleem.
 */
function pathFor(customerId: string, objectId: string): string {
  return `/klanten/${customerId}/objecten/${objectId}`;
}

export async function createServiceAgreement(
  customerId: string,
  objectId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = serviceAgreementSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data: pricing, error: pricingError } = await supabase
    .from('pricings')
    .insert({
      company_id: profile.company_id,
      type: parsed.data.pricingType,
      amount_cents:
        parsed.data.pricingType === 'per_job' && parsed.data.amountEuros !== undefined
          ? Math.round(parsed.data.amountEuros * 100)
          : null,
      hourly_rate_cents:
        parsed.data.pricingType === 'hourly' && parsed.data.hourlyRateEuros !== undefined
          ? Math.round(parsed.data.hourlyRateEuros * 100)
          : null,
      vat_rate: parsed.data.vatRate,
    })
    .select('id')
    .single();

  if (pricingError || !pricing) {
    logger.error('createServiceAgreement: pricing insert failed', {
      code: pricingError?.code,
      companyId: profile.company_id,
    });
    return actionError({
      code: pricingError?.code || 'create_pricing_failed',
      message: 'De prijsafspraak kon niet worden aangemaakt. Probeer het opnieuw.',
    });
  }

  const { data: agreement, error: agreementError } = await supabase
    .from('service_agreements')
    .insert({
      company_id: profile.company_id,
      object_id: objectId,
      service_id: parsed.data.serviceId,
      pricing_id: pricing.id,
      frequency_type: parsed.data.frequencyType,
      frequency_interval_days: frequencyIntervalDays(
        parsed.data.frequencyType,
        parsed.data.customIntervalDays,
      ),
      preferred_day: parsed.data.preferredDay ?? null,
      preferred_daypart: parsed.data.preferredDaypart ?? null,
      flexibility_window_days: parsed.data.flexibilityWindowDays,
      call_ahead_required: parsed.data.callAheadRequired,
    })
    .select('id')
    .single();

  if (agreementError || !agreement) {
    if (agreementError?.code === '23505') {
      return actionError({
        code: 'service_agreement_exists',
        message: 'Er bestaat al een dienstafspraak voor deze dienst bij dit object.',
      });
    }
    logger.error('createServiceAgreement: agreement insert failed', {
      code: agreementError?.code,
      objectId,
    });
    return actionError({
      code: agreementError?.code || 'create_service_agreement_failed',
      message: 'De dienstafspraak kon niet worden aangemaakt. Probeer het opnieuw.',
    });
  }

  revalidatePath(pathFor(customerId, objectId));
  return actionSuccess({ id: agreement.id });
}

export async function updateServiceAgreement(
  customerId: string,
  objectId: string,
  agreementId: string,
  pricingId: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = serviceAgreementSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  await requireOnboardedUser();
  const supabase = await createClient();

  const { error: pricingError } = await supabase
    .from('pricings')
    .update({
      type: parsed.data.pricingType,
      amount_cents:
        parsed.data.pricingType === 'per_job' && parsed.data.amountEuros !== undefined
          ? Math.round(parsed.data.amountEuros * 100)
          : null,
      hourly_rate_cents:
        parsed.data.pricingType === 'hourly' && parsed.data.hourlyRateEuros !== undefined
          ? Math.round(parsed.data.hourlyRateEuros * 100)
          : null,
      vat_rate: parsed.data.vatRate,
    })
    .eq('id', pricingId);

  if (pricingError) {
    logger.error('updateServiceAgreement: pricing update failed', {
      code: pricingError.code,
      pricingId,
    });
    return actionError({
      code: pricingError.code || 'update_pricing_failed',
      message: 'De prijsafspraak kon niet worden bijgewerkt. Probeer het opnieuw.',
    });
  }

  const { error: agreementError } = await supabase
    .from('service_agreements')
    .update({
      service_id: parsed.data.serviceId,
      frequency_type: parsed.data.frequencyType,
      frequency_interval_days: frequencyIntervalDays(
        parsed.data.frequencyType,
        parsed.data.customIntervalDays,
      ),
      preferred_day: parsed.data.preferredDay ?? null,
      preferred_daypart: parsed.data.preferredDaypart ?? null,
      flexibility_window_days: parsed.data.flexibilityWindowDays,
      call_ahead_required: parsed.data.callAheadRequired,
    })
    .eq('id', agreementId);

  if (agreementError) {
    logger.error('updateServiceAgreement: agreement update failed', {
      code: agreementError.code,
      agreementId,
    });
    return actionError({
      code: agreementError.code || 'update_service_agreement_failed',
      message: 'De dienstafspraak kon niet worden bijgewerkt. Probeer het opnieuw.',
    });
  }

  revalidatePath(pathFor(customerId, objectId));
  return actionSuccess(null);
}

const pauseSchema = z.object({
  pausedUntil: z
    .string()
    .refine((value) => new Date(value) >= new Date(new Date().toDateString()), {
      message: 'De pauzeerdatum mag niet in het verleden liggen.',
    }),
});

/**
 * FR-005: pauzeren. BR-030 (annuleren van toekomstige niet-vergrendelde
 * beurten) is hier NIET geïmplementeerd — er bestaan nog geen `jobs` deze
 * sprint (Planning is expliciet buiten scope); dit volgt zodra de jobs-tabel
 * er is (Sprint 3).
 */
export async function pauseServiceAgreement(
  customerId: string,
  objectId: string,
  agreementId: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = pauseSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Kies een geldige pauzeerdatum.');
  }

  await requireOnboardedUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('service_agreements')
    .update({ status: 'paused', paused_until: parsed.data.pausedUntil })
    .eq('id', agreementId);

  if (error) {
    logger.error('pauseServiceAgreement failed', { code: error.code, agreementId });
    return actionError({
      code: error.code || 'pause_service_agreement_failed',
      message: 'De dienstafspraak kon niet worden gepauzeerd. Probeer het opnieuw.',
    });
  }

  revalidatePath(pathFor(customerId, objectId));
  return actionSuccess(null);
}

export async function resumeServiceAgreement(
  customerId: string,
  objectId: string,
  agreementId: string,
): Promise<ActionResult<null>> {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('service_agreements')
    .update({ status: 'active', paused_until: null })
    .eq('id', agreementId);

  if (error) {
    logger.error('resumeServiceAgreement failed', { code: error.code, agreementId });
    return actionError({
      code: error.code || 'resume_service_agreement_failed',
      message: 'De dienstafspraak kon niet worden hervat. Probeer het opnieuw.',
    });
  }

  revalidatePath(pathFor(customerId, objectId));
  return actionSuccess(null);
}

/** Terminale status (FR-005/statusmachine "geen teruggaan") — DB-trigger dwingt dit ook af. */
export async function endServiceAgreement(
  customerId: string,
  objectId: string,
  agreementId: string,
): Promise<ActionResult<null>> {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('service_agreements')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', agreementId);

  if (error) {
    logger.error('endServiceAgreement failed', { code: error.code, agreementId });
    return actionError({
      code: error.code || 'end_service_agreement_failed',
      message: 'De dienstafspraak kon niet worden beëindigd. Probeer het opnieuw.',
    });
  }

  revalidatePath(pathFor(customerId, objectId));
  return actionSuccess(null);
}
