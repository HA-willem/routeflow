'use server';

import { revalidatePath } from 'next/cache';

import { requireOnboardedUser } from '@/lib/auth/session';
import { actionError, actionSuccess, type ActionResult, validationActionError } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';
import {
  frequencyIntervalDays,
  pauseServiceAgreementSchema,
  serviceAgreementSchema,
} from '@/lib/validation/service-agreement';

/** FR-020: horizon-laag genereert 12 weken vooruit (40_Implementatieplan.md Sprint 3). */
const HORIZON_WEEKS = 12;

/**
 * FR-004 AC3 / FR-005: roept de planning-generate Edge Function aan (ADR-008 —
 * planning genereren hoort nooit in de Server Action zelf, 41_CodingStandards.md
 * § 7) om de eerste/eerstvolgende beurten voor deze afspraak te genereren.
 *
 * Bewust best-effort: als dit mislukt (bv. Edge Function tijdelijk onbereikbaar)
 * blijft de zojuist aangemaakte/hervatte dienstafspraak toch geldig — de
 * planner kan de beurten later alsnog laten genereren. Fout wordt gelogd, niet
 * stilzwijgend genegeerd (41_CodingStandards.md § 10).
 */
async function triggerPlanningGenerate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  serviceAgreementId: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke('planning-generate', {
    body: {
      from_date: new Date().toISOString().slice(0, 10),
      weeks: HORIZON_WEEKS,
      service_agreement_id: serviceAgreementId,
    },
  });

  if (error) {
    logger.error('triggerPlanningGenerate: planning-generate aanroep mislukt', {
      serviceAgreementId,
      message: error.message,
    });
  }
}

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
          : parsed.data.pricingType === 'subscription' &&
              parsed.data.subscriptionAmountEuros !== undefined
            ? Math.round(parsed.data.subscriptionAmountEuros * 100)
            : null,
      hourly_rate_cents:
        parsed.data.pricingType === 'hourly' && parsed.data.hourlyRateEuros !== undefined
          ? Math.round(parsed.data.hourlyRateEuros * 100)
          : null,
      included_jobs_per_period:
        parsed.data.pricingType === 'subscription'
          ? (parsed.data.includedJobsPerPeriod ?? null)
          : null,
      overage_amount_cents:
        parsed.data.pricingType === 'subscription' && parsed.data.overageAmountEuros !== undefined
          ? Math.round(parsed.data.overageAmountEuros * 100)
          : null,
      billing_period: parsed.data.pricingType === 'subscription' ? 'monthly' : 'per_job',
      billing_timing:
        parsed.data.pricingType === 'subscription' ? (parsed.data.billingTiming ?? null) : null,
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

  // FR-004 AC3: "eerste beurt automatisch gegenereerd" — nieuwe afspraken
  // starten als 'active' (DB-default), dus de horizon-laag mag direct draaien.
  await triggerPlanningGenerate(supabase, agreement.id);

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
          : parsed.data.pricingType === 'subscription' &&
              parsed.data.subscriptionAmountEuros !== undefined
            ? Math.round(parsed.data.subscriptionAmountEuros * 100)
            : null,
      hourly_rate_cents:
        parsed.data.pricingType === 'hourly' && parsed.data.hourlyRateEuros !== undefined
          ? Math.round(parsed.data.hourlyRateEuros * 100)
          : null,
      included_jobs_per_period:
        parsed.data.pricingType === 'subscription'
          ? (parsed.data.includedJobsPerPeriod ?? null)
          : null,
      overage_amount_cents:
        parsed.data.pricingType === 'subscription' && parsed.data.overageAmountEuros !== undefined
          ? Math.round(parsed.data.overageAmountEuros * 100)
          : null,
      billing_period: parsed.data.pricingType === 'subscription' ? 'monthly' : 'per_job',
      billing_timing:
        parsed.data.pricingType === 'subscription' ? (parsed.data.billingTiming ?? null) : null,
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

/** FR-005: pauzeren. */
export async function pauseServiceAgreement(
  customerId: string,
  objectId: string,
  agreementId: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = pauseServiceAgreementSchema.safeParse(input);
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

  // BR-030: alle toekomstige NIET-vergrendelde beurten van deze afspraak
  // worden geannuleerd; vergrendelde beurten laat de planner handmatig
  // behandelen (BR-030 "Vergrendelde beurten"). Al afgeronde/gefactureerde/
  // geannuleerde beurten blijven ongemoeid — alleen de nog-openstaande statussen
  // tellen als "toekomstig te plannen werk".
  const { error: cancelError } = await supabase
    .from('jobs')
    .update({ status: 'cancelled' })
    .eq('service_agreement_id', agreementId)
    .eq('locked', false)
    .gte('scheduled_date', new Date().toISOString().slice(0, 10))
    .in('status', ['proposed', 'planned', 'en_route', 'rescheduling']);

  if (cancelError) {
    // De afspraak is al gepauzeerd (belangrijkste deel van FR-005 geslaagd);
    // dit loggen i.p.v. de hele actie te laten falen — de planner ziet de
    // niet-geannuleerde beurten dan nog in de lijst en kan handmatig ingrijpen.
    logger.error('pauseServiceAgreement: BR-030-annulering van beurten mislukt', {
      code: cancelError.code,
      agreementId,
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

  // FR-005: "hervatten... volgende beurt wordt gegenereerd" — BR-030 annuleerde
  // de toekomstige beurten bij pauzeren, dus de horizon-laag moet opnieuw draaien.
  await triggerPlanningGenerate(supabase, agreementId);

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
