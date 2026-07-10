import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/composed/PageHeader';
import { CustomerForm } from '@/components/domain/CustomerForm';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import { updateCustomer } from '../../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Klant bewerken — RouteFlow',
};

export default async function KlantBewerkenPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOnboardedUser();
  const { id } = await params;
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .is('archived_at', null)
    .maybeSingle();

  if (!customer) {
    notFound();
  }

  return (
    <div>
      <PageHeader title={`${customer.name} bewerken`} />
      <CustomerForm
        submitLabel="Wijzigingen opslaan"
        defaultValues={{
          name: customer.name,
          type: customer.type,
          email: customer.email ?? undefined,
          phone: customer.phone ?? undefined,
          whatsappNumber: customer.whatsapp_number ?? undefined,
          whatsappOptIn: customer.whatsapp_opt_in,
          emailOptIn: customer.email_opt_in,
          billingPreference: customer.billing_preference,
          kvkNumber: customer.kvk_number ?? undefined,
          vatNumber: customer.vat_number ?? undefined,
          paymentTermsDays: customer.payment_terms_days,
          notes: customer.notes ?? undefined,
        }}
        onSubmit={updateCustomer.bind(null, customer.id)}
        redirectTo={() => `/klanten/${customer.id}`}
      />
    </div>
  );
}
