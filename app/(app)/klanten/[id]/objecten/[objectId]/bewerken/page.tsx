import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/composed/PageHeader';
import { ObjectForm } from '@/components/domain/ObjectForm';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import { updateObject } from '../../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Object bewerken — RouteFlow',
};

export default async function ObjectBewerkenPage({
  params,
}: {
  params: Promise<{ id: string; objectId: string }>;
}) {
  await requireOnboardedUser();
  const { id: customerId, objectId } = await params;
  const supabase = await createClient();
  const { data: object } = await supabase
    .from('objects')
    .select('*')
    .eq('id', objectId)
    .eq('customer_id', customerId)
    .is('archived_at', null)
    .maybeSingle();

  if (!object) {
    notFound();
  }

  return (
    <div>
      <PageHeader title={`${object.address_line1} bewerken`} />
      <ObjectForm
        submitLabel="Wijzigingen opslaan"
        defaultValues={{
          addressLine1: object.address_line1,
          addressLine2: object.address_line2 ?? undefined,
          postalCode: object.postal_code,
          city: object.city,
          countryCode: 'NL',
          type: object.type,
          accessNotes: object.access_notes ?? undefined,
        }}
        onSubmit={updateObject.bind(null, customerId, object.id)}
        redirectTo={() => `/klanten/${customerId}/objecten/${object.id}`}
      />
    </div>
  );
}
