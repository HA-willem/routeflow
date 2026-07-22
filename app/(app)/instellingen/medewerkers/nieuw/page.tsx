import { PageHeader } from '@/components/composed/PageHeader';
import { EmployeeForm } from '@/components/domain/EmployeeForm';
import { requireOnboardedUser } from '@/lib/auth/session';

import { createEmployee } from '../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nieuwe medewerker — ServOps',
};

export default async function NieuweMedewerkerPage() {
  await requireOnboardedUser();

  return (
    <div>
      <PageHeader title="Nieuwe medewerker" />
      <EmployeeForm
        submitLabel="Medewerker aanmaken"
        onSubmit={createEmployee}
        redirectTo="/instellingen/medewerkers"
      />
    </div>
  );
}
