'use server';

import { revalidatePath } from 'next/cache';

import { requireOnboardedUser } from '@/lib/auth/session';
import { actionError, actionSuccess, type ActionResult, validationActionError } from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';
import { companySettingsSchema } from '@/lib/validation/company-settings';

/**
 * Bedrijfsinstellingen (FR-100) — alleen Eigenaar/Admin (23_Gebruikersrollen.md § 2,
 * "Bedrijfsinstellingen"-rij). `config_json.invoicing` wordt gemerged, niet
 * overschreven — andere config_json-sleutels (bv. `depot_location`, PRD § 19
 * A-13) blijven ongemoeid.
 */
export async function updateCompanySettings(input: unknown): Promise<ActionResult<null>> {
  const parsed = companySettingsSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  const { profile } = await requireOnboardedUser();
  if (!['owner', 'admin'].includes(profile.role)) {
    return actionError({
      code: 'forbidden',
      message: 'Alleen een eigenaar of admin kan bedrijfsinstellingen wijzigen.',
    });
  }

  const supabase = await createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('config_json')
    .eq('id', profile.company_id)
    .single();

  const existingConfig = (company?.config_json as Record<string, unknown> | null) ?? {};
  const nextConfig = {
    ...existingConfig,
    invoicing: {
      company_code: parsed.data.companyCode ?? '',
      kvk_number: parsed.data.kvkNumber ?? '',
      vat_number: parsed.data.vatNumber ?? '',
      iban: parsed.data.iban ?? '',
      bic: parsed.data.bic ?? '',
    },
  };

  const { error } = await supabase
    .from('companies')
    .update({
      name: parsed.data.name,
      company_type: parsed.data.companyType ?? null,
      industry: parsed.data.industry ?? null,
      instant_invoice_on_complete: parsed.data.instantInvoiceOnComplete,
      config_json: nextConfig,
    })
    .eq('id', profile.company_id);

  if (error) {
    logger.error('updateCompanySettings failed', {
      code: error.code,
      companyId: profile.company_id,
    });
    return actionError({
      code: error.code || 'update_company_settings_failed',
      message: 'De instellingen konden niet worden opgeslagen. Probeer het opnieuw.',
    });
  }

  revalidatePath('/instellingen/bedrijf');
  return actionSuccess(null);
}
