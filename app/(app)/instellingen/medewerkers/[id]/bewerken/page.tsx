import { notFound } from 'next/navigation';

import { ArchiveConfirmButton } from '@/components/composed/ArchiveConfirmButton';
import { PageHeader } from '@/components/composed/PageHeader';
import { EmployeeForm } from '@/components/domain/EmployeeForm';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import { archiveEmployee, updateEmployee } from '../../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Medewerker bewerken — RouteFlow',
};

export default async function MedewerkerBewerkenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOnboardedUser();
  const { id } = await params;
  const supabase = await createClient();
  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .is('archived_at', null)
    .maybeSingle();

  if (!employee) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title={`${employee.first_name} ${employee.last_name} bewerken`}
        action={
          <ArchiveConfirmButton
            triggerLabel="Archiveren"
            title="Medewerker archiveren?"
            description={`"${employee.first_name} ${employee.last_name}" wordt gearchiveerd en verdwijnt uit het medewerkersoverzicht.`}
            action={archiveEmployee.bind(null, employee.id)}
          />
        }
      />
      <EmployeeForm
        submitLabel="Wijzigingen opslaan"
        defaultValues={{
          firstName: employee.first_name,
          lastName: employee.last_name,
          phone: employee.phone,
        }}
        onSubmit={updateEmployee.bind(null, employee.id)}
        redirectTo="/instellingen/medewerkers"
      />
    </div>
  );
}
