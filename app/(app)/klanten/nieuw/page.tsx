import { NieuweKlantWizard } from '@/components/domain/NieuweKlantWizard';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import { createService } from '../../instellingen/diensten/actions';
import { createServiceAgreement } from '../[id]/objecten/[objectId]/dienstafspraken/actions';
import { createObject } from '../[id]/objecten/actions';
import { createCustomer } from '../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nieuwe klant — ServOps',
};

export default async function NieuweKlantPage() {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data: services } = await supabase
    .from('services')
    .select('id, name')
    .eq('company_id', profile.company_id)
    .is('archived_at', null)
    .order('name', { ascending: true });

  return (
    <NieuweKlantWizard
      services={services ?? []}
      createCustomerAction={createCustomer}
      createObjectAction={createObject}
      createServiceAgreementAction={createServiceAgreement}
      createServiceAction={createService}
    />
  );
}
