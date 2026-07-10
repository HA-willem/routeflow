import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArchiveConfirmButton } from '@/components/composed/ArchiveConfirmButton';
import { DataTable } from '@/components/composed/DataTable';
import { PageHeader } from '@/components/composed/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/composed/Tabs';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { Button } from '@/components/primitives/button';
import { Card, CardContent } from '@/components/primitives/card';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import { archiveObject } from '../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Object — RouteFlow',
};

const OBJECT_TYPE_LABEL: Record<'residence' | 'commercial' | 'complex' | 'other', string> = {
  residence: 'Woning',
  commercial: 'Bedrijfspand',
  complex: 'Appartementencomplex',
  other: 'Overig',
};

const FREQUENCY_LABEL: Record<
  'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'once' | 'custom',
  string
> = {
  weekly: 'Wekelijks',
  biweekly: 'Elke 2 weken',
  monthly: 'Maandelijks',
  quarterly: 'Elk kwartaal',
  yearly: 'Jaarlijks',
  once: 'Eenmalig',
  custom: 'Aangepast',
};

const STATUS_BADGE: Record<
  'active' | 'paused' | 'ended',
  { label: string; tone: 'success' | 'warning' | 'muted' }
> = {
  active: { label: 'Actief', tone: 'success' },
  paused: { label: 'Gepauzeerd', tone: 'warning' },
  ended: { label: 'Beëindigd', tone: 'muted' },
};

export default async function ObjectDetailPage({
  params,
}: {
  params: Promise<{ id: string; objectId: string }>;
}) {
  await requireOnboardedUser();
  const { id: customerId, objectId } = await params;
  const supabase = await createClient();
  const { data: object } = await supabase
    .from('objects')
    .select('*')
    .eq('id', objectId)
    .eq('customer_id', customerId)
    .is('archived_at', null)
    .maybeSingle();

  if (!object) {
    notFound();
  }

  const { data: agreements } = await supabase
    .from('service_agreements')
    .select('*, services(name), pricings(*)')
    .eq('object_id', object.id)
    .order('created_at', { ascending: true });

  return (
    <div>
      <PageHeader
        title={object.address_line1}
        description={`${object.postal_code} ${object.city}`}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/klanten/${customerId}/objecten/${object.id}/bewerken`}>Bewerken</Link>
            </Button>
            <ArchiveConfirmButton
              triggerLabel="Archiveren"
              title="Object archiveren?"
              description={`"${object.address_line1}" wordt gearchiveerd en verdwijnt uit de objectenlijst.`}
              action={archiveObject.bind(null, customerId, object.id)}
            />
          </div>
        }
      />
      <Tabs defaultValue="gegevens">
        <TabsList>
          <TabsTrigger value="gegevens">Gegevens</TabsTrigger>
          <TabsTrigger value="dienstafspraken">Dienstafspraken</TabsTrigger>
        </TabsList>
        <TabsContent value="gegevens">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted">Adres</p>
                <p className="text-text">
                  {object.address_line1}
                  {object.address_line2 ? `, ${object.address_line2}` : ''}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Postcode / plaats</p>
                <p className="text-text">
                  {object.postal_code} {object.city}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Type</p>
                <p className="text-text">{OBJECT_TYPE_LABEL[object.type]}</p>
              </div>
              {object.access_notes ? (
                <div className="col-span-2">
                  <p className="text-text-muted">Toegangsinstructies</p>
                  <p className="text-text whitespace-pre-wrap">{object.access_notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="dienstafspraken">
          <div className="mb-4 flex justify-end">
            <Button asChild>
              <Link href={`/klanten/${customerId}/objecten/${object.id}/dienstafspraken/nieuw`}>
                Afspraak toevoegen
              </Link>
            </Button>
          </div>
          <DataTable
            rows={agreements ?? []}
            getRowKey={(row) => row.id}
            onRowHref={(row) =>
              `/klanten/${customerId}/objecten/${object.id}/dienstafspraken/${row.id}/bewerken`
            }
            emptyTitle="Nog geen dienstafspraken."
            emptyDescription="Voeg een dienstafspraak toe om dit object in te plannen."
            emptyAction={
              <Button asChild>
                <Link href={`/klanten/${customerId}/objecten/${object.id}/dienstafspraken/nieuw`}>
                  Afspraak toevoegen
                </Link>
              </Button>
            }
            columns={[
              { header: 'Dienst', cell: (row) => row.services?.name ?? '—' },
              { header: 'Frequentie', cell: (row) => FREQUENCY_LABEL[row.frequency_type] },
              {
                header: 'Prijs',
                cell: (row) =>
                  row.pricings
                    ? row.pricings.type === 'hourly'
                      ? `€${((row.pricings.hourly_rate_cents ?? 0) / 100).toFixed(2)}/u`
                      : `€${((row.pricings.amount_cents ?? 0) / 100).toFixed(2)}`
                    : '—',
              },
              {
                header: 'Status',
                cell: (row) => (
                  <StatusBadge
                    label={STATUS_BADGE[row.status].label}
                    tone={STATUS_BADGE[row.status].tone}
                  />
                ),
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
