import { PageHeader } from '@/components/composed/PageHeader';
import { BrancheTemplateImportForm } from '@/components/domain/BrancheTemplateImportForm';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import { importBrancheTemplate } from '../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Branchesjabloon importeren — ServOps',
};

export default async function BrancheSjabloonPage() {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();
  const { data: company } = await supabase
    .from('companies')
    .select('industry')
    .eq('id', profile.company_id)
    .single();

  return (
    <div>
      <PageHeader
        title="Branchesjabloon importeren"
        description="Kies een branche en importeer een startset diensten — je kunt na het importeren alles nog aanpassen of verwijderen."
      />
      <BrancheTemplateImportForm
        defaultIndustryId={company?.industry}
        onImport={importBrancheTemplate}
      />
    </div>
  );
}
