import Link from 'next/link';

import { DataTable } from '@/components/composed/DataTable';
import { PageHeader } from '@/components/composed/PageHeader';
import { Button } from '@/components/primitives/button';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Medewerkers — RouteFlow',
};

export default async function MedewerkersPage() {
  await requireOnboardedUser();
  const supabase = await createClient();
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .is('archived_at', null)
    .order('last_name', { ascending: true });

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
        ]}
      />
    </div>
  );
}
