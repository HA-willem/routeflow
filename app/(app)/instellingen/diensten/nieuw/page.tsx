import { PageHeader } from '@/components/composed/PageHeader';
import { ServiceForm } from '@/components/domain/ServiceForm';
import { requireOnboardedUser } from '@/lib/auth/session';

import { createService } from '../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nieuwe dienst — RouteFlow',
};

export default async function NieuweDienstPage() {
  await requireOnboardedUser();

  return (
    <div>
      <PageHeader title="Nieuwe dienst" />
      <ServiceForm
        submitLabel="Dienst aanmaken"
        onSubmit={createService}
        redirectTo="/instellingen/diensten"
      />
    </div>
  );
}
