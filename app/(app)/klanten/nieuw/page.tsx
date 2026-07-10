import { PageHeader } from '@/components/composed/PageHeader';
import { CustomerForm } from '@/components/domain/CustomerForm';
import { requireOnboardedUser } from '@/lib/auth/session';

import { createCustomer } from '../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nieuwe klant — RouteFlow',
};

export default async function NieuweKlantPage() {
  await requireOnboardedUser();

  return (
    <div>
      <PageHeader title="Nieuwe klant" />
      <CustomerForm
        submitLabel="Klant aanmaken"
        onSubmit={createCustomer}
        redirectTo="/klanten/:id"
      />
    </div>
  );
}
