import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArchiveConfirmButton } from '@/components/composed/ArchiveConfirmButton';
import { DataTable } from '@/components/composed/DataTable';
import { PageHeader } from '@/components/composed/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/composed/Tabs';
import { Button } from '@/components/primitives/button';
import { Card, CardContent } from '@/components/primitives/card';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import { archiveCustomer } from '../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Klant — RouteFlow',
};

const CUSTOMER_TYPE_LABEL: Record<'person' | 'business', string> = {
  person: 'Particulier',
  business: 'Zakelijk',
};

const BILLING_PREFERENCE_LABEL: Record<'email' | 'whatsapp' | 'post', string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  post: 'Post',
};

const OBJECT_TYPE_LABEL: Record<'residence' | 'commercial' | 'complex' | 'other', string> = {
  residence: 'Woning',
  commercial: 'Bedrijfspand',
  complex: 'Appartementencomplex',
  other: 'Overig',
};

export default async function KlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOnboardedUser();
  const { id } = await params;
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .is('archived_at', null)
    .maybeSingle();

  if (!customer) {
    notFound();
  }

  const { data: objects } = await supabase
    .from('objects')
    .select('*')
    .eq('customer_id', customer.id)
    .is('archived_at', null)
    .order('address_line1', { ascending: true });

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={CUSTOMER_TYPE_LABEL[customer.type]}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/klanten/${customer.id}/bewerken`}>Bewerken</Link>
            </Button>
            <ArchiveConfirmButton
              triggerLabel="Archiveren"
              title="Klant archiveren?"
              description={`"${customer.name}" wordt gearchiveerd en verdwijnt uit de klantenlijst. Dit kan niet ongedaan worden gemaakt via de UI.`}
              action={archiveCustomer.bind(null, customer.id)}
            />
          </div>
        }
      />
      <Tabs defaultValue="gegevens">
        <TabsList>
          <TabsTrigger value="gegevens">Gegevens</TabsTrigger>
          <TabsTrigger value="objecten">Objecten</TabsTrigger>
        </TabsList>
        <TabsContent value="gegevens">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted">E-mailadres</p>
                <p className="text-text">{customer.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-text-muted">Telefoonnummer</p>
                <p className="text-text">{customer.phone ?? '—'}</p>
              </div>
              <div>
                <p className="text-text-muted">WhatsApp-nummer</p>
                <p className="text-text">
                  {customer.whatsapp_number ?? '—'}
                  {customer.whatsapp_number
                    ? customer.whatsapp_opt_in
                      ? ' (opt-in)'
                      : ' (geen opt-in)'
                    : ''}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Facturatievoorkeur</p>
                <p className="text-text">{BILLING_PREFERENCE_LABEL[customer.billing_preference]}</p>
              </div>
              {customer.type === 'business' ? (
                <div>
                  <p className="text-text-muted">KVK-nummer</p>
                  <p className="text-text">{customer.kvk_number ?? '—'}</p>
                </div>
              ) : null}
              {customer.type === 'business' ? (
                <div>
                  <p className="text-text-muted">BTW-nummer</p>
                  <p className="text-text">{customer.vat_number ?? '—'}</p>
                </div>
              ) : null}
              <div>
                <p className="text-text-muted">Betaaltermijn</p>
                <p className="text-text">{customer.payment_terms_days} dagen</p>
              </div>
              {customer.notes ? (
                <div className="col-span-2">
                  <p className="text-text-muted">Notities</p>
                  <p className="text-text whitespace-pre-wrap">{customer.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="objecten">
          <div className="mb-4 flex justify-end">
            <Button asChild>
              <Link href={`/klanten/${customer.id}/objecten/nieuw`}>Object toevoegen</Link>
            </Button>
          </div>
          <DataTable
            rows={objects ?? []}
            getRowKey={(row) => row.id}
            onRowHref={(row) => `/klanten/${customer.id}/objecten/${row.id}`}
            emptyTitle="Nog geen objecten."
            emptyDescription="Voeg het eerste object toe om dienstafspraken te kunnen aanmaken."
            emptyAction={
              <Button asChild>
                <Link href={`/klanten/${customer.id}/objecten/nieuw`}>Object toevoegen</Link>
              </Button>
            }
            columns={[
              { header: 'Adres', cell: (row) => row.address_line1 },
              { header: 'Postcode', cell: (row) => row.postal_code },
              { header: 'Plaats', cell: (row) => row.city },
              { header: 'Type', cell: (row) => OBJECT_TYPE_LABEL[row.type] },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
