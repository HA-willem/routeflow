import Link from 'next/link';

import { DataTable } from '@/components/composed/DataTable';
import { PageHeader } from '@/components/composed/PageHeader';
import { Button } from '@/components/primitives/button';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Diensten — ServOps',
};

export default async function DienstenPage() {
  await requireOnboardedUser();
  const supabase = await createClient();
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .is('archived_at', null)
    .order('name', { ascending: true });

  return (
    <div>
      <PageHeader
        title="Diensten"
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/instellingen/diensten/sjabloon">Sjabloon importeren</Link>
            </Button>
            <Button asChild>
              <Link href="/instellingen/diensten/nieuw">Nieuwe dienst</Link>
            </Button>
          </div>
        }
      />
      <DataTable
        rows={services ?? []}
        getRowKey={(row) => row.id}
        onRowHref={(row) => `/instellingen/diensten/${row.id}/bewerken`}
        emptyTitle="Nog geen diensten."
        emptyDescription="Voeg je eerste dienst toe, of importeer een startset voor je branche."
        emptyAction={
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/instellingen/diensten/sjabloon">Sjabloon importeren</Link>
            </Button>
            <Button asChild>
              <Link href="/instellingen/diensten/nieuw">Nieuwe dienst</Link>
            </Button>
          </div>
        }
        columns={[
          { header: 'Naam', cell: (row) => row.name },
          { header: 'Duur', cell: (row) => `${row.standard_duration_minutes} min` },
          {
            header: 'Prijs',
            cell: (row) => `€${(row.standard_price_cents / 100).toFixed(2)}`,
          },
          { header: 'BTW', cell: (row) => `${row.vat_rate}%` },
          { header: 'Weersgevoelig', cell: (row) => (row.is_weather_sensitive ? 'Ja' : 'Nee') },
        ]}
      />
    </div>
  );
}
