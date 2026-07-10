'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireOnboardedUser } from '@/lib/auth/session';
import {
  actionError,
  actionSuccess,
  type ActionResult,
  mapPostgresError,
  validationActionError,
} from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';
import { objectSchema } from '@/lib/validation/object';

/**
 * Objecten-CRUD (FR-002/FR-003) — analoog aan klanten/actions.ts. `customerId`
 * komt uit de route (`/klanten/[id]/objecten/**`), niet uit user-input.
 */
export async function createObject(
  customerId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = objectSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('objects')
    .insert({
      company_id: profile.company_id,
      customer_id: customerId,
      address_line1: parsed.data.addressLine1,
      address_line2: parsed.data.addressLine2 ?? null,
      postal_code: parsed.data.postalCode,
      city: parsed.data.city,
      country_code: parsed.data.countryCode,
      type: parsed.data.type,
      access_notes: parsed.data.accessNotes ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    if (error?.code !== '23505') {
      logger.error('createObject failed', { code: error?.code, customerId });
    }
    return mapPostgresError(
      error,
      { code: 'object_address_taken', message: 'Dit adres is al toegevoegd bij deze klant.' },
      {
        code: 'create_object_failed',
        message: 'Het object kon niet worden aangemaakt. Probeer het opnieuw.',
      },
    );
  }

  revalidatePath(`/klanten/${customerId}`);
  return actionSuccess({ id: data.id });
}

export async function updateObject(
  customerId: string,
  objectId: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = objectSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  await requireOnboardedUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('objects')
    .update({
      address_line1: parsed.data.addressLine1,
      address_line2: parsed.data.addressLine2 ?? null,
      postal_code: parsed.data.postalCode,
      city: parsed.data.city,
      country_code: parsed.data.countryCode,
      type: parsed.data.type,
      access_notes: parsed.data.accessNotes ?? null,
    })
    .eq('id', objectId);

  if (error) {
    if (error.code !== '23505') {
      logger.error('updateObject failed', { code: error.code, objectId });
    }
    return mapPostgresError(
      error,
      { code: 'object_address_taken', message: 'Dit adres is al toegevoegd bij deze klant.' },
      {
        code: 'update_object_failed',
        message: 'Het object kon niet worden bijgewerkt. Probeer het opnieuw.',
      },
    );
  }

  revalidatePath(`/klanten/${customerId}`);
  revalidatePath(`/klanten/${customerId}/objecten/${objectId}`);
  return actionSuccess(null);
}

/** Archiveren (soft-delete via archived_at) — analoog aan archiveCustomer. */
export async function archiveObject(
  customerId: string,
  objectId: string,
): Promise<ActionResult<null>> {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('objects')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', objectId);

  if (error) {
    logger.error('archiveObject failed', { code: error.code, objectId });
    return actionError({
      code: error.code || 'archive_object_failed',
      message: 'Het object kon niet worden gearchiveerd. Probeer het opnieuw.',
    });
  }

  revalidatePath(`/klanten/${customerId}`);
  redirect(`/klanten/${customerId}`);
}
