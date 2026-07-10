'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireOnboardedUser } from '@/lib/auth/session';
import { actionError, actionSuccess, type ActionResult, validationActionError } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';
import { employeeSchema } from '@/lib/validation/employee';

/**
 * Medewerkers-CRUD (11_DatabaseConcept.md § 3.5, FR-021) — alleen Eigenaar/Admin
 * mogen schrijven (013_employees_availability.sql, 23_Gebruikersrollen.md § 2).
 */
export async function createEmployee(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('employees')
    .insert({
      company_id: profile.company_id,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone,
    })
    .select('id')
    .single();

  if (error || !data) {
    logger.error('createEmployee failed', { code: error?.code, companyId: profile.company_id });
    return actionError({
      code: error?.code || 'create_employee_failed',
      message: 'De medewerker kon niet worden aangemaakt. Probeer het opnieuw.',
    });
  }

  revalidatePath('/instellingen/medewerkers');
  return actionSuccess({ id: data.id });
}

export async function updateEmployee(
  employeeId: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  await requireOnboardedUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('employees')
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone,
    })
    .eq('id', employeeId);

  if (error) {
    logger.error('updateEmployee failed', { code: error.code, employeeId });
    return actionError({
      code: error.code || 'update_employee_failed',
      message: 'De medewerker kon niet worden bijgewerkt. Probeer het opnieuw.',
    });
  }

  revalidatePath('/instellingen/medewerkers');
  revalidatePath(`/instellingen/medewerkers/${employeeId}`);
  return actionSuccess(null);
}

export async function archiveEmployee(employeeId: string): Promise<ActionResult<null>> {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('employees')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', employeeId);

  if (error) {
    logger.error('archiveEmployee failed', { code: error.code, employeeId });
    return actionError({
      code: error.code || 'archive_employee_failed',
      message: 'De medewerker kon niet worden gearchiveerd. Probeer het opnieuw.',
    });
  }

  revalidatePath('/instellingen/medewerkers');
  redirect('/instellingen/medewerkers');
}
