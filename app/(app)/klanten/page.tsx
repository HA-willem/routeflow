import Link from 'next/link';

import { DataTable } from '@/components/composed/DataTable';
import { PageHeader } from '@/components/composed/PageHeader';
import { Button } from '@/components/primitives/button';
import { requireOnboardedUser } from '@/lib/auth/session';
import { CUSTOMER_TYPE_LABEL } from '@/lib/labels';
import { createClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Klanten — RouteFlow',
};

export default async function KlantenPage() {
  await requireOnboardedUser();
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .is('archived_at', null)
    .order('name', { ascending: true });

  return (
    <div>
      <PageHeader
        title="Klanten"
        action={
          <Button asChild>
            <Link href="/klanten/nieuw">Nieuwe klant</Link>
          </Button>
        }
      />
      <DataTable
        rows={customers ?? []}
        getRowKey={(row) => row.id}
        onRowHref={(row) => `/klanten/${row.id}`}
        emptyTitle="Nog geen klanten."
        emptyDescription="Voeg je eerste klant toe om objecten en dienstafspraken te kunnen aanmaken."
        emptyAction={
          <Button asChild>
            <Link href="/klanten/nieuw">Nieuwe klant</Link>
          </Button>
        }
        columns={[
          { header: 'Naam', cell: (row) => row.name },
          { header: 'Type', cell: (row) => CUSTOMER_TYPE_LABEL[row.type] },
          { header: 'E-mail', cell: (row) => row.email ?? '—' },
          { header: 'Telefoon', cell: (row) => row.phone ?? '—' },
        ]}
      />
    </div>
  );
}
