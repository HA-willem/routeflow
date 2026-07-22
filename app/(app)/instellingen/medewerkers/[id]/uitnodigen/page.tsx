import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/composed/PageHeader';
import { InviteEmployeeForm } from '@/components/domain/InviteEmployeeForm';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import { inviteEmployee } from '../../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Medewerker uitnodigen — ServOps',
};

export default async function UitnodigenPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOnboardedUser();
  const { id } = await params;
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from('employees')
    .select('id, first_name, last_name, user_id')
    .eq('id', id)
    .maybeSingle();

  if (!employee) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title={`${employee.first_name} ${employee.last_name} uitnodigen`}
        description={
          employee.user_id
            ? 'Deze medewerker heeft al een actief account.'
            : 'Stuur een e-mail waarmee deze medewerker zelf een wachtwoord kan instellen en kan inloggen op de mobiele app.'
        }
      />
      {employee.user_id ? null : (
        <InviteEmployeeForm employeeId={employee.id} onInvite={inviteEmployee} />
      )}
    </div>
  );
}
