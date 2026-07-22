import Link from 'next/link';

import { DataTable } from '@/components/composed/DataTable';
import { PageHeader } from '@/components/composed/PageHeader';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { Button } from '@/components/primitives/button';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Medewerkers — ServOps',
};

type InviteStatus =
  | { label: 'Actief'; tone: 'success' }
  | { label: 'Uitgenodigd'; tone: 'warning' }
  | { label: 'Verlopen'; tone: 'muted' }
  | { label: 'Nog niet uitgenodigd'; tone: 'muted' };

interface PendingInvite {
  employee_id: string;
  expires_at: string;
  accepted_at: string | null;
}

export default async function MedewerkersPage() {
  await requireOnboardedUser();
  const supabase = await createClient();
  const [{ data: employees }, { data: invites }] = await Promise.all([
    supabase.from('employees').select('*').is('archived_at', null).order('last_name'),
    supabase
      .from('invites')
      .select('employee_id, expires_at, accepted_at')
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  const pendingInviteByEmployee = new Map<string, PendingInvite>();
  for (const invite of invites ?? []) {
    if (!pendingInviteByEmployee.has(invite.employee_id)) {
      pendingInviteByEmployee.set(invite.employee_id, invite);
    }
  }

  function inviteStatus(employee: { user_id: string | null; id: string }): InviteStatus {
    if (employee.user_id) return { label: 'Actief', tone: 'success' };
    const invite = pendingInviteByEmployee.get(employee.id);
    if (!invite) return { label: 'Nog niet uitgenodigd', tone: 'muted' };
    if (new Date(invite.expires_at) <= new Date()) return { label: 'Verlopen', tone: 'muted' };
    return { label: 'Uitgenodigd', tone: 'warning' };
  }

  return (
    <div>
      <PageHeader
        title="Medewerkers"
        action={
          <Button asChild>
            <Link href="/instellingen/medewerkers/nieuw">Nieuwe medewerker</Link>
          </Button>
        }
      />
      <DataTable
        rows={employees ?? []}
        getRowKey={(row) => row.id}
        onRowHref={(row) => `/instellingen/medewerkers/${row.id}/bewerken`}
        emptyTitle="Nog geen medewerkers."
        emptyDescription="Voeg je eerste medewerker toe om routes te kunnen plannen."
        emptyAction={
          <Button asChild>
            <Link href="/instellingen/medewerkers/nieuw">Nieuwe medewerker</Link>
          </Button>
        }
        columns={[
          { header: 'Naam', cell: (row) => `${row.first_name} ${row.last_name}` },
          { header: 'Telefoon', cell: (row) => row.phone },
          { header: 'Actief', cell: (row) => (row.is_active ? 'Ja' : 'Nee') },
          {
            header: 'Account',
            cell: (row) => {
              const status = inviteStatus(row);
              return <StatusBadge label={status.label} tone={status.tone} />;
            },
          },
          {
            header: '',
            interactive: true,
            cell: (row) =>
              row.user_id ? null : (
                <Link
                  href={`/instellingen/medewerkers/${row.id}/uitnodigen`}
                  className="text-primary text-sm underline underline-offset-4"
                >
                  {pendingInviteByEmployee.has(row.id) ? 'Opnieuw uitnodigen' : 'Uitnodigen'}
                </Link>
              ),
          },
        ]}
      />
    </div>
  );
}
