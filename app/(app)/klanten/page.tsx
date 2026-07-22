import Link from 'next/link';
import { Suspense } from 'react';

import { DataTable } from '@/components/composed/DataTable';
import { FilterBar } from '@/components/composed/FilterBar';
import { PageHeader } from '@/components/composed/PageHeader';
import { Button } from '@/components/primitives/button';
import { requireOnboardedUser } from '@/lib/auth/session';
import { CUSTOMER_TYPE_LABEL } from '@/lib/labels';
import { createClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Klanten — ServOps',
};

const PAGE_SIZE = 25;
const NO_MATCH_ID = '00000000-0000-0000-0000-000000000000';

interface CustomerObjectRow {
  address_line1: string;
  city: string | null;
  archived_at: string | null;
  created_at: string;
}

interface CustomerRow {
  id: string;
  name: string;
  type: 'person' | 'business';
  email: string | null;
  phone: string | null;
  objects: CustomerObjectRow[] | null;
}

function primaryObject(objects: CustomerObjectRow[] | null) {
  const active = (objects ?? []).filter((object) => !object.archived_at);
  const sorted = [...active].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return {
    primary: sorted[0] as CustomerObjectRow | undefined,
    extraCount: Math.max(0, sorted.length - 1),
  };
}

interface KlantenPageProps {
  searchParams: Promise<{ q?: string; type?: string; stad?: string; page?: string }>;
}

export default async function KlantenPage({ searchParams }: KlantenPageProps) {
  await requireOnboardedUser();
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const type = params.type === 'person' || params.type === 'business' ? params.type : undefined;
  const stad = params.stad?.trim() ?? '';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const hasActiveFilters = q !== '' || type !== undefined || stad !== '';

  const supabase = await createClient();

  let customerIdsInCity: string[] | null = null;
  if (stad) {
    const { data: matchingObjects } = await supabase
      .from('objects')
      .select('customer_id')
      .is('archived_at', null)
      .ilike('city', stad);
    const ids = Array.from(new Set((matchingObjects ?? []).map((row) => row.customer_id)));
    customerIdsInCity = ids.length > 0 ? ids : [NO_MATCH_ID];
  }

  let query = supabase
    .from('customers')
    .select('id, name, type, email, phone, objects(address_line1, city, archived_at, created_at)', {
      count: 'exact',
    })
    .is('archived_at', null);

  if (type) {
    query = query.eq('type', type);
  }
  if (q) {
    const sanitized = q.replace(/[,()]/g, '');
    query = query.or(
      `name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`,
    );
  }
  if (customerIdsInCity) {
    query = query.in('id', customerIdsInCity);
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data: customers, count } = await query
    .order('name', { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  const { data: cityRows } = await supabase
    .from('objects')
    .select('city')
    .is('archived_at', null)
    .not('city', 'is', null);
  const cityOptions = Array.from(
    new Set((cityRows ?? []).map((row) => row.city).filter((city): city is string => !!city)),
  )
    .sort((a, b) => a.localeCompare(b))
    .map((city) => ({ value: city, label: city }));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number) {
    const usp = new URLSearchParams();
    if (q) usp.set('q', q);
    if (type) usp.set('type', type);
    if (stad) usp.set('stad', stad);
    if (target > 1) usp.set('page', String(target));
    const qs = usp.toString();
    return qs ? `/klanten?${qs}` : '/klanten';
  }

  return (
    <div>
      <PageHeader
        title="Klanten"
        description={`${total} klant${total === 1 ? '' : 'en'}`}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/klanten/importeren">Klanten importeren</Link>
            </Button>
            <Button asChild>
              <Link href="/klanten/nieuw">Nieuwe klant</Link>
            </Button>
          </div>
        }
      />
      <Suspense fallback={null}>
        <FilterBar
          fields={[
            {
              type: 'search',
              key: 'q',
              label: 'Zoeken',
              placeholder: 'Zoek op naam, e-mail of telefoon',
            },
            {
              type: 'select',
              key: 'type',
              label: 'Type',
              placeholder: 'Alle types',
              options: Object.entries(CUSTOMER_TYPE_LABEL).map(([value, label]) => ({
                value,
                label,
              })),
            },
            {
              type: 'select',
              key: 'stad',
              label: 'Plaats',
              placeholder: 'Alle plaatsen',
              options: cityOptions,
            },
          ]}
        />
      </Suspense>
      <DataTable
        rows={(customers ?? []) as CustomerRow[]}
        getRowKey={(row) => row.id}
        onRowHref={(row) => `/klanten/${row.id}`}
        emptyTitle={
          hasActiveFilters ? 'Geen klanten gevonden voor deze filters.' : 'Nog geen klanten.'
        }
        emptyDescription={
          hasActiveFilters
            ? 'Pas je zoekterm of filters aan.'
            : 'Voeg je eerste klant toe om objecten en dienstafspraken te kunnen aanmaken.'
        }
        emptyAction={
          hasActiveFilters ? (
            <Button asChild variant="outline">
              <Link href="/klanten">Wis filters</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/klanten/nieuw">Nieuwe klant</Link>
            </Button>
          )
        }
        columns={[
          { header: 'Naam', cell: (row) => row.name },
          { header: 'Type', cell: (row) => CUSTOMER_TYPE_LABEL[row.type] },
          {
            header: 'Adres',
            cell: (row) => {
              const { primary, extraCount } = primaryObject(row.objects);
              if (!primary) return '—';
              return extraCount > 0
                ? `${primary.address_line1} +${extraCount}`
                : primary.address_line1;
            },
          },
          {
            header: 'Plaats',
            cell: (row) => primaryObject(row.objects).primary?.city ?? '—',
          },
          { header: 'E-mail', cell: (row) => row.email ?? '—' },
          { header: 'Telefoon', cell: (row) => row.phone ?? '—' },
        ]}
      />
      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-end gap-2">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1)}>Vorige</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Vorige
            </Button>
          )}
          <span className="text-text-muted text-sm">
            Pagina {page} van {totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1)}>Volgende</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Volgende
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
