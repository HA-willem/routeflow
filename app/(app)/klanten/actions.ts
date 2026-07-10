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
import { customerSchema } from '@/lib/validation/customer';

/**
 * Klanten-CRUD (FR-001) — dunne Server Action-schil rond een 1-op-1
 * PostgREST-insert/update binnen RLS (41_CodingStandards.md § 7). RLS
 * (004_customers.sql) is de enige harde grens; company_id wordt hier alleen
 * gezet voor leesbaarheid, niet als vervanging daarvan (§ 8).
 */
export async function createCustomer(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customers')
    .insert({
      company_id: profile.company_id,
      name: parsed.data.name,
      type: parsed.data.type,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      whatsapp_number: parsed.data.whatsappNumber ?? null,
      whatsapp_opt_in: parsed.data.whatsappOptIn,
      email_opt_in: parsed.data.emailOptIn,
      billing_preference: parsed.data.billingPreference,
      kvk_number: parsed.data.kvkNumber ?? null,
      vat_number: parsed.data.vatNumber ?? null,
      payment_terms_days: parsed.data.paymentTermsDays,
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    if (error?.code !== '23505') {
      logger.error('createCustomer failed', { code: error?.code, companyId: profile.company_id });
    }
    return mapPostgresError(
      error,
      { code: 'customer_email_taken', message: 'Deze e-mail is al in gebruik.' },
      {
        code: 'create_customer_failed',
        message: 'De klant kon niet worden aangemaakt. Probeer het opnieuw.',
      },
    );
  }

  revalidatePath('/klanten');
  return actionSuccess({ id: data.id });
}

export async function updateCustomer(
  customerId: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  await requireOnboardedUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('customers')
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      whatsapp_number: parsed.data.whatsappNumber ?? null,
      whatsapp_opt_in: parsed.data.whatsappOptIn,
      email_opt_in: parsed.data.emailOptIn,
      billing_preference: parsed.data.billingPreference,
      kvk_number: parsed.data.kvkNumber ?? null,
      vat_number: parsed.data.vatNumber ?? null,
      payment_terms_days: parsed.data.paymentTermsDays,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', customerId);

  if (error) {
    if (error.code !== '23505') {
      logger.error('updateCustomer failed', { code: error.code, customerId });
    }
    return mapPostgresError(
      error,
      { code: 'customer_email_taken', message: 'Deze e-mail is al in gebruik.' },
      {
        code: 'update_customer_failed',
        message: 'De klant kon niet worden bijgewerkt. Probeer het opnieuw.',
      },
    );
  }

  revalidatePath('/klanten');
  revalidatePath(`/klanten/${customerId}`);
  return actionSuccess(null);
}

/**
 * Archiveren (BR-040/BR-502): soft-delete via archived_at. Er is bewust geen
 * hard-delete-pad (004_customers.sql heeft geen DELETE-policy) — dit maakt
 * BR-040 ("klant met facturen niet verwijderbaar") triviaal waar.
 */
export async function archiveCustomer(customerId: string): Promise<ActionResult<null>> {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('customers')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', customerId);

  if (error) {
    logger.error('archiveCustomer failed', { code: error.code, customerId });
    return actionError({
      code: error.code || 'archive_customer_failed',
      message: 'De klant kon niet worden gearchiveerd. Probeer het opnieuw.',
    });
  }

  revalidatePath('/klanten');
  redirect('/klanten');
}
