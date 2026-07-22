'use server';

import { revalidatePath } from 'next/cache';

import { requireOnboardedUser } from '@/lib/auth/session';
import { actionError, actionSuccess, type ActionResult } from '@/lib/errors';
import {
  DEFAULT_PAYMENT_TERMS_DAYS,
  validateImportRows,
  type ImportRowInput,
  type ImportRowValidated,
  type ImportSummary,
} from '@/lib/import/csv';
import { logger } from '@/lib/logging/logger';
import { MapboxProvider } from '@/lib/routing/mapbox-provider';
import { createClient } from '@/lib/supabase/server';

/**
 * FR-006: CSV-import klanten/objecten. Twee stappen, elk een eigen Server
 * Action (geen staging-tabel voor ruwe rijen — zie 036_import_jobs.sql):
 * valideren (+ geocoding) retourneert verrijkte rijen aan de client, die ze
 * in wizard-state houdt tot de gebruiker bevestigt; bevestigen herhaalt geen
 * validatie/geocoding, alleen de daadwerkelijke inserts.
 */
export async function validateImportRowsAction(
  rows: ImportRowInput[],
): Promise<ActionResult<{ results: ImportRowValidated[]; summary: ImportSummary }>> {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { data: existingCustomers } = await supabase.from('customers').select('email');
  const existingEmails = new Set(
    (existingCustomers ?? [])
      .map((row) => row.email?.trim().toLowerCase())
      .filter((email): email is string => !!email),
  );

  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!mapboxToken) {
    return actionError({
      code: 'config_error',
      message: 'Geocoding is niet geconfigureerd (MAPBOX_ACCESS_TOKEN ontbreekt).',
    });
  }
  const provider = new MapboxProvider(mapboxToken);

  const { results, summary } = await validateImportRows(rows, existingEmails, (input) =>
    provider.geocode(input),
  );

  return actionSuccess({ results, summary });
}

interface CommitImportResult {
  importJobId: string;
  successCount: number;
  errorCount: number;
  errorLog: { row: number; message: string }[];
}

export async function commitImportAction(
  rows: ImportRowValidated[],
): Promise<ActionResult<CommitImportResult>> {
  const { profile, user } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data: job, error: jobError } = await supabase
    .from('import_jobs')
    .insert({
      company_id: profile.company_id,
      status: 'running',
      total_rows: rows.length,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (jobError || !job) {
    logger.error('commitImport: import_jobs insert mislukt', { message: jobError?.message });
    return actionError({
      code: jobError?.code ?? 'import_job_failed',
      message: 'Import kon niet worden gestart.',
    });
  }

  const errorLog: { row: number; message: string }[] = rows
    .filter((row) => row.status === 'error')
    .map((row) => ({ row: row.rowNumber, message: row.errors.join('; ') }));

  let successCount = 0;

  for (const row of rows.filter((r) => r.status !== 'error')) {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        company_id: profile.company_id,
        name: row.name,
        type: row.customerType,
        email: row.email || null,
        phone: row.phone || null,
        whatsapp_opt_in: false,
        email_opt_in: true,
        billing_preference: 'email',
        kvk_number: row.kvkNumber || null,
        payment_terms_days: DEFAULT_PAYMENT_TERMS_DAYS,
      })
      .select('id')
      .single();

    if (customerError || !customer) {
      errorLog.push({
        row: row.rowNumber,
        message: `Klant kon niet worden aangemaakt (${customerError?.message ?? 'onbekende fout'}).`,
      });
      continue;
    }

    const { error: objectError } = await supabase.from('objects').insert({
      company_id: profile.company_id,
      customer_id: customer.id,
      address_line1: row.addressLine1,
      postal_code: row.postalCode,
      city: row.city,
      country_code: 'NL',
      type: 'residence',
      location: row.location ? `POINT(${row.location.lng} ${row.location.lat})` : null,
      location_status: row.geocodeStatus === 'geocoded' ? 'geocoded' : 'failed',
    });

    if (objectError) {
      errorLog.push({
        row: row.rowNumber,
        message: `Object kon niet worden aangemaakt (${objectError.message}).`,
      });
      continue;
    }

    successCount += 1;
  }

  const errorCount = rows.length - successCount;

  await supabase
    .from('import_jobs')
    .update({
      status: 'completed',
      success_count: successCount,
      error_count: errorCount,
      error_log: errorLog,
      finished_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  revalidatePath('/klanten');

  return actionSuccess({ importJobId: job.id, successCount, errorCount, errorLog });
}
