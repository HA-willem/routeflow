'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireOnboardedUser } from '@/lib/auth/session';
import { actionError, actionSuccess, type ActionResult, validationActionError } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';
import { serviceSchema } from '@/lib/validation/service';

/**
 * Diensten-CRUD (12_Entiteiten.md § 5) — alleen Eigenaar/Admin mogen schrijven
 * (006_services.sql). De euro→cent-omzetting gebeurt hier, niet in het Zod-schema
 * (zie lib/validation/service.ts voor de reden).
 */
export async function createService(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('services')
    .insert({
      company_id: profile.company_id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      standard_duration_minutes: parsed.data.standardDurationMinutes,
      standard_price_cents: Math.round(parsed.data.standardPriceEuros * 100),
      vat_rate: parsed.data.vatRate,
      is_weather_sensitive: parsed.data.isWeatherSensitive,
      weather_sensitivity_type: parsed.data.weatherSensitivityType ?? null,
      icon: parsed.data.icon ?? null,
      color_hex: parsed.data.colorHex ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    logger.error('createService failed', { code: error?.code, companyId: profile.company_id });
    return actionError({
      code: error?.code || 'create_service_failed',
      message: 'De dienst kon niet worden aangemaakt. Probeer het opnieuw.',
    });
  }

  revalidatePath('/instellingen/diensten');
  return actionSuccess({ id: data.id });
}

export async function updateService(
  serviceId: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  await requireOnboardedUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('services')
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      standard_duration_minutes: parsed.data.standardDurationMinutes,
      standard_price_cents: Math.round(parsed.data.standardPriceEuros * 100),
      vat_rate: parsed.data.vatRate,
      is_weather_sensitive: parsed.data.isWeatherSensitive,
      weather_sensitivity_type: parsed.data.weatherSensitivityType ?? null,
      icon: parsed.data.icon ?? null,
      color_hex: parsed.data.colorHex ?? null,
    })
    .eq('id', serviceId);

  if (error) {
    logger.error('updateService failed', { code: error.code, serviceId });
    return actionError({
      code: error.code || 'update_service_failed',
      message: 'De dienst kon niet worden bijgewerkt. Probeer het opnieuw.',
    });
  }

  revalidatePath('/instellingen/diensten');
  revalidatePath(`/instellingen/diensten/${serviceId}`);
  return actionSuccess(null);
}

export async function archiveService(serviceId: string): Promise<ActionResult<null>> {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('services')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', serviceId);

  if (error) {
    logger.error('archiveService failed', { code: error.code, serviceId });
    return actionError({
      code: error.code || 'archive_service_failed',
      message: 'De dienst kon niet worden gearchiveerd. Probeer het opnieuw.',
    });
  }

  revalidatePath('/instellingen/diensten');
  redirect('/instellingen/diensten');
}
