import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/composed/PageHeader';
import { ServiceAgreementForm } from '@/components/domain/ServiceAgreementForm';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import { createService } from '../../../../../../instellingen/diensten/actions';
import { createServiceAgreement } from '../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nieuwe dienstafspraak — ServOps',
};

export default async function NieuweDienstafspraakPage({
  params,
}: {
  params: Promise<{ id: string; objectId: string }>;
}) {
  const { profile } = await requireOnboardedUser();
  const { id: customerId, objectId } = await params;
  const supabase = await createClient();

  const { data: object } = await supabase
    .from('objects')
    .select('id, address_line1')
    .eq('id', objectId)
    .eq('customer_id', customerId)
    .is('archived_at', null)
    .maybeSingle();

  if (!object) {
    notFound();
  }

  const { data: services } = await supabase
    .from('services')
    .select('id, name')
    .eq('company_id', profile.company_id)
    .is('archived_at', null)
    .order('name', { ascending: true });

  return (
    <div>
      <PageHeader title="Nieuwe dienstafspraak" description={object.address_line1} />
      <ServiceAgreementForm
        services={services ?? []}
        createServiceAction={createService}
        submitLabel="Afspraak aanmaken"
        onSubmit={createServiceAgreement.bind(null, customerId, objectId)}
        redirectTo={`/klanten/${customerId}/objecten/${objectId}`}
      />
    </div>
  );
}
