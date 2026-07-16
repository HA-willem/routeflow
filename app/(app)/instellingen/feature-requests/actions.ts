'use server';

import { revalidatePath } from 'next/cache';

import { requireOnboardedUser } from '@/lib/auth/session';
import { actionError, actionSuccess, type ActionResult, validationActionError } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';
import { featureRequestSchema } from '@/lib/validation/feature-request';

/**
 * Feature request indienen (FR-950, 46_PlatformAdmin.md § 2.1) — alleen
 * Eigenaar/Admin/Planner mogen dit (23_Gebruikersrollen.md § 2,
 * 029_feature_requests.sql RLS-INSERT-policy).
 */
export async function createFeatureRequest(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = featureRequestSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  const { user, profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('feature_requests')
    .insert({
      company_id: profile.company_id,
      submitted_by: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      context: parsed.data.context ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    logger.error('createFeatureRequest failed', {
      code: error?.code,
      companyId: profile.company_id,
    });
    return actionError({
      code: error?.code || 'create_feature_request_failed',
      message: 'De feature request kon niet worden ingediend. Probeer het opnieuw.',
    });
  }

  revalidatePath('/instellingen/feature-requests');
  return actionSuccess({ id: data.id });
}
