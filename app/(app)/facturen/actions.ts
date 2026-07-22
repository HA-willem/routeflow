'use server';

import { revalidatePath } from 'next/cache';

import { requireOnboardedUser } from '@/lib/auth/session';
import { sendEmail } from '@/lib/email/resend';
import { actionError, actionSuccess, type ActionResult, validationActionError } from '@/lib/errors';
import { generateInvoicePdf } from '@/lib/invoicing/pdf';
import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';
import { creditInvoiceSchema } from '@/lib/validation/invoice';

/**
 * MVP-facturatie-acties (16_Facturatie.md, PRD § 19 A-19/A-20). Nummering
 * (BR-020) gebeurt in next_invoice_number() (019_invoicing_mvp.sql) — hier
 * alleen orkestratie: nummer toekennen, PDF genereren, uploaden, e-mailen,
 * status bijwerken. Geen Edge Function nodig (geen Mollie-secret, geen
 * cross-tenant service-role-schrijfactie) — een normale, RLS-gebonden Server
 * Action volstaat (41_CodingStandards.md § 7).
 */

interface InvoicingConfig {
  company_code: string;
  kvk_number: string;
  vat_number: string;
  iban: string;
  bic: string;
}

function readInvoicingConfig(configJson: unknown): InvoicingConfig | null {
  const invoicing = (configJson as { invoicing?: Partial<InvoicingConfig> } | null)?.invoicing;
  if (
    !invoicing?.company_code ||
    !invoicing?.kvk_number ||
    !invoicing?.vat_number ||
    !invoicing?.iban ||
    !invoicing?.bic
  ) {
    return null;
  }
  return invoicing as InvoicingConfig;
}

export async function sendInvoice(
  invoiceId: string,
): Promise<ActionResult<{ invoiceNumber: string }>> {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('name, config_json')
    .eq('id', profile.company_id)
    .single();

  if (!company) {
    return actionError({ code: 'not_found', message: 'Bedrijf niet gevonden.' });
  }

  const invoicingConfig = readInvoicingConfig(company.config_json);
  if (!invoicingConfig) {
    return actionError({
      code: 'config_error',
      message:
        'Factuurgegevens (bedrijfscode, KVK, BTW-nr, IBAN, BIC) zijn nog niet ingesteld voor dit bedrijf.',
    });
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, customers(name, email)')
    .eq('id', invoiceId)
    .single();

  if (!invoice) {
    return actionError({ code: 'not_found', message: 'Factuur niet gevonden.' });
  }
  if (invoice.status !== 'draft') {
    return actionError({
      code: 'invalid_status',
      message: 'Alleen conceptfacturen kunnen verzonden worden.',
    });
  }

  const { data: lines } = await supabase
    .from('invoice_lines')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sequence');

  const customer = invoice.customers as { name: string; email: string | null } | null;
  if (!customer?.email) {
    return actionError({
      code: 'no_email',
      message: 'Klant heeft geen e-mailadres — factuur kan niet automatisch verzonden worden.',
    });
  }

  const year = new Date(invoice.invoice_date).getFullYear();
  const { data: invoiceNumber, error: numberError } = await supabase.rpc('next_invoice_number', {
    p_year: year,
    p_company_code: invoicingConfig.company_code,
  });

  if (numberError || !invoiceNumber) {
    logger.error('sendInvoice: nummering mislukt', { message: numberError?.message });
    return actionError({
      code: numberError?.code ?? 'numbering_failed',
      message: 'Factuurnummer kon niet worden toegekend.',
    });
  }

  const pdfBytes = await generateInvoicePdf({
    invoiceNumber,
    invoiceDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    companyName: company.name,
    companyCode: invoicingConfig.company_code,
    kvkNumber: invoicingConfig.kvk_number,
    vatNumber: invoicingConfig.vat_number,
    iban: invoicingConfig.iban,
    bic: invoicingConfig.bic,
    customerName: customer.name,
    lines: (lines ?? []).map((line) => ({
      description: line.description,
      quantity: Number(line.quantity),
      unitPriceCents: line.unit_price_cents,
      vatRate: Number(line.vat_rate),
      vatAmountCents: line.vat_amount_cents,
      totalAmountCents: line.total_amount_cents,
    })),
    totalAmountCents: invoice.total_amount_cents,
    totalTaxCents: invoice.total_tax_cents,
  });

  const storagePath = `${profile.company_id}/${invoiceId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('invoices')
    .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });

  if (uploadError) {
    logger.error('sendInvoice: PDF-upload mislukt', { message: uploadError.message });
    return actionError({
      code: 'pdf_upload_failed',
      message: 'Factuur-PDF kon niet worden opgeslagen.',
    });
  }

  const emailResult = await sendEmail({
    to: customer.email,
    subject: `Factuur ${invoiceNumber} van ${company.name}`,
    html: `<p>Beste ${customer.name},</p><p>Bijgevoegd vindt u factuur ${invoiceNumber}. Gelieve te betalen vóór ${invoice.due_date}.</p>`,
    attachment: { filename: `${invoiceNumber}.pdf`, content: pdfBytes },
  });

  if (!emailResult.ok) {
    logger.warn('sendInvoice: e-mail kon niet verzonden worden', { error: emailResult.error });
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({ invoice_number: invoiceNumber, status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', invoiceId);

  if (updateError) {
    logger.error('sendInvoice: statusupdate mislukt', { message: updateError.message });
    return actionError({
      code: 'update_failed',
      message: 'Factuurstatus kon niet worden bijgewerkt.',
    });
  }

  revalidatePath('/facturen');
  return actionSuccess({ invoiceNumber });
}

export async function markInvoicePaid(invoiceId: string): Promise<ActionResult<null>> {
  await requireOnboardedUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc('mark_invoice_paid', { p_invoice_id: invoiceId });
  if (error) {
    logger.error('markInvoicePaid mislukt', { message: error.message });
    return actionError({
      code: error.code ?? 'mark_paid_failed',
      message: 'Factuur kon niet als betaald gemarkeerd worden.',
    });
  }

  revalidatePath('/facturen');
  return actionSuccess(null);
}

/**
 * FR-068/BR-020: creditfactuur — create_credit_invoice() (035_invoice_credit_
 * notes.sql) doet de rolcontrole/statuscontrole en maakt de negatieve
 * factuur+regels aan (als 'draft'). Versturen (nummeren/PDF/e-mail) is een
 * losse, bewuste vervolgstap door de planner via de bestaande sendInvoice()
 * hierboven — geen automatische verzending vanuit deze actie.
 */
export async function createCreditInvoice(
  invoiceId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = creditInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde correctieregels.');
  }

  await requireOnboardedUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('create_credit_invoice', {
    p_invoice_id: invoiceId,
    p_lines: parsed.data.lines.map((line) => ({
      description: line.description,
      amount_cents: Math.round(line.amountEuros * 100),
      vat_rate: line.vatRate,
    })),
    p_note: parsed.data.note || undefined,
  });

  if (error || !data) {
    logger.error('createCreditInvoice mislukt', { message: error?.message, invoiceId });
    return actionError({
      code: error?.code ?? 'create_credit_invoice_failed',
      message: error?.message ?? 'De creditfactuur kon niet worden aangemaakt.',
    });
  }

  revalidatePath('/facturen');
  revalidatePath(`/facturen/${invoiceId}`);
  return actionSuccess({ id: data.id });
}
