import { PageHeader } from '@/components/composed/PageHeader';
import { CompanySettingsForm } from '@/components/domain/CompanySettingsForm';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import type { CompanySettingsInput } from '@/lib/validation/company-settings';

import { updateCompanySettings } from './actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bedrijfsinstellingen — ServOps',
};

interface InvoicingConfig {
  company_code?: string;
  kvk_number?: string;
  vat_number?: string;
  iban?: string;
  bic?: string;
}

export default async function BedrijfPage() {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data: company } = await supabase
    .from('companies')
    .select('name, company_type, industry, instant_invoice_on_complete, config_json')
    .eq('id', profile.company_id)
    .single();

  const invoicing =
    (company?.config_json as { invoicing?: InvoicingConfig } | null)?.invoicing ?? {};

  const defaultValues: CompanySettingsInput = {
    name: company?.name ?? '',
    companyType: company?.company_type ?? undefined,
    industry: company?.industry ?? undefined,
    instantInvoiceOnComplete: company?.instant_invoice_on_complete ?? false,
    companyCode: invoicing.company_code ?? '',
    kvkNumber: invoicing.kvk_number ?? '',
    vatNumber: invoicing.vat_number ?? '',
    iban: invoicing.iban ?? '',
    bic: invoicing.bic ?? '',
  };

  return (
    <div>
      <PageHeader
        title="Bedrijfsinstellingen"
        description="Bedrijfsgegevens, facturatie en het type bedrijf/branche waarop ServOps zich afstemt."
      />
      <CompanySettingsForm defaultValues={defaultValues} onSubmit={updateCompanySettings} />
    </div>
  );
}
