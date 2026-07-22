'use server';

import { randomBytes } from 'crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireOnboardedUser } from '@/lib/auth/session';
import { sendEmployeeInviteEmail } from '@/lib/email/invite-employee';
import { siteUrl } from '@/lib/env';
import { actionError, actionSuccess, type ActionResult, validationActionError } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';
import { employeeSchema, inviteEmployeeSchema } from '@/lib/validation/employee';

const INVITE_TTL_DAYS = 7;

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

/**
 * Medewerker-uitnodiging (22_Authenticatie.md § 8, FR-103) — alleen
 * Eigenaar/Admin (040_employee_invites.sql-RLS dwingt dit ook op DB-niveau
 * af, deze check geeft alleen een vroegere, duidelijkere foutmelding).
 * Idempotent: een bestaande, nog niet geaccepteerde uitnodiging voor deze
 * medewerker wordt vervangen (nieuw token/nieuwe vervaldatum) i.p.v. te
 * stapelen — dekt zowel "eerste keer uitnodigen" als "opnieuw uitnodigen"
 * (verlopen of e-mail niet aangekomen) met dezelfde actie.
 */
export async function inviteEmployee(
  employeeId: string,
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = inviteEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Vul een geldig e-mailadres in.');
  }

  const { profile } = await requireOnboardedUser();
  if (!['owner', 'admin'].includes(profile.role)) {
    return actionError({
      code: 'forbidden',
      message: 'Alleen een eigenaar of admin kan medewerkers uitnodigen.',
    });
  }

  const supabase = await createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .single();
  if (!company) {
    return actionError({ code: 'not_found', message: 'Bedrijf niet gevonden.' });
  }

  await supabase.from('invites').delete().eq('employee_id', employeeId).is('accepted_at', null);

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase.from('invites').insert({
    company_id: profile.company_id,
    employee_id: employeeId,
    email: parsed.data.email,
    token,
    role: 'employee',
    invited_by: profile.id,
    expires_at: expiresAt,
  });

  if (insertError) {
    logger.error('inviteEmployee: invite-insert mislukt', {
      code: insertError.code,
      employeeId,
    });
    return actionError({
      code: insertError.code || 'invite_failed',
      message: 'De uitnodiging kon niet worden aangemaakt. Probeer het opnieuw.',
    });
  }

  const emailResult = await sendEmployeeInviteEmail({
    to: parsed.data.email,
    companyName: company.name,
    inviteUrl: `${siteUrl}/uitnodiging/${token}`,
  });

  if (!emailResult.ok) {
    logger.error('inviteEmployee: verzenden mislukt', {
      error: emailResult.error,
      employeeId,
    });
    return actionError({
      code: emailResult.error,
      message:
        emailResult.error === 'config_error'
          ? 'E-mailverzending is nog niet ingesteld voor dit bedrijf — de uitnodiging is aangemaakt maar niet verstuurd.'
          : 'De uitnodigingsmail kon niet worden verstuurd. Probeer het opnieuw.',
    });
  }

  revalidatePath('/instellingen/medewerkers');
  return actionSuccess(null);
}

/** Trekt een nog niet geaccepteerde uitnodiging in (22_Authenticatie.md § 8: "Undo"). */
export async function revokeInvite(inviteId: string): Promise<ActionResult<null>> {
  const { profile } = await requireOnboardedUser();
  if (!['owner', 'admin'].includes(profile.role)) {
    return actionError({
      code: 'forbidden',
      message: 'Alleen een eigenaar of admin kan uitnodigingen intrekken.',
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.from('invites').delete().eq('id', inviteId);

  if (error) {
    logger.error('revokeInvite mislukt', { code: error.code, inviteId });
    return actionError({
      code: error.code || 'revoke_invite_failed',
      message: 'De uitnodiging kon niet worden ingetrokken. Probeer het opnieuw.',
    });
  }

  revalidatePath('/instellingen/medewerkers');
  return actionSuccess(null);
}
