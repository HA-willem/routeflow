import { PageHeader } from '@/components/composed/PageHeader';
import { FeatureRequestForm } from '@/components/domain/FeatureRequestForm';
import { requireOnboardedUser } from '@/lib/auth/session';

import { createFeatureRequest } from '../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nieuwe feature request — RouteFlow',
};

export default async function NieuweFeatureRequestPage() {
  await requireOnboardedUser();

  return (
    <div>
      <PageHeader
        title="Nieuwe feature request"
        description="Wat zou RouteFlow voor jou beter maken? We bekijken elk verzoek."
      />
      <FeatureRequestForm
        onSubmit={createFeatureRequest}
        redirectTo="/instellingen/feature-requests"
      />
    </div>
  );
}
