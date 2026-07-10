import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/composed/PageHeader';
import { ObjectForm } from '@/components/domain/ObjectForm';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import { createObject } from '../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nieuw object — RouteFlow',
};

export default async function NieuwObjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOnboardedUser();
  const { id: customerId } = await params;
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('id', customerId)
    .is('archived_at', null)
    .maybeSingle();

  if (!customer) {
    notFound();
  }

  return (
    <div>
      <PageHeader title="Nieuw object" description={customer.name} />
      <ObjectForm
        submitLabel="Object aanmaken"
        onSubmit={createObject.bind(null, customerId)}
        redirectTo={(objectId) => `/klanten/${customerId}/objecten/${objectId}`}
      />
    </div>
  );
}
