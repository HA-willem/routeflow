'use server';

import { redirect } from 'next/navigation';

import { actionError, type ActionResult, validationActionError } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { POSTGRES_ERROR_CODE } from '@/lib/supabase/postgres-error-codes';
import { createClient } from '@/lib/supabase/server';
import { onboardingSchema } from '@/lib/validation/auth';

/**
 * Rondt onboarding af (FR-100/FR-101): roept public.onboard_company() aan (het
 * enige toegestane schrijfpad naar companies/users, zie 003_rls_baseline.sql),
 * koppelt daarna company_id in de JWT-claim en ververst de sessie zodat
 * current_company_id() vanaf de volgende request klopt (22_Authenticatie.md § 6).
 */
export async function onboardCompany(input: unknown): Promise<ActionResult<null>> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Vul je bedrijfsnaam in.');
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const fullName =
    typeof user.user_metadata.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
  if (!fullName) {
    return actionError({
      code: 'missing_full_name',
      message: 'We konden je naam niet vinden.',
      hint: 'Log opnieuw in en probeer het nogmaals.',
    });
  }

  const { data: company, error } = await supabase.rpc('onboard_company', {
    company_name: parsed.data.companyName,
    owner_full_name: fullName,
  });

  if (error) {
    if (error.code === POSTGRES_ERROR_CODE.UNIQUE_VIOLATION) {
      redirect('/');
    }
    logger.error('onboard_company RPC failed', { code: error.code, userId: user.id });
    return actionError({
      code: error.code || 'onboarding_failed',
      message: 'Het aanmaken van je bedrijf is niet gelukt. Probeer het opnieuw.',
    });
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: { company_id: company.id },
  });
  if (updateError) {
    logger.error('Failed to link company_id onto user_metadata after onboarding', {
      code: updateError.code,
      userId: user.id,
      companyId: company.id,
    });
    return actionError({
      code: 'company_link_failed',
      message: 'Je bedrijf is aangemaakt, maar er ging iets mis bij het koppelen.',
      hint: 'Log opnieuw in om verder te gaan.',
    });
  }

  await supabase.auth.refreshSession();

  redirect('/');
}
