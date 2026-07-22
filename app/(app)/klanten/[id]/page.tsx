import { Check } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArchiveConfirmButton } from '@/components/composed/ArchiveConfirmButton';
import { DataTable } from '@/components/composed/DataTable';
import { PageHeader } from '@/components/composed/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/composed/Tabs';
import { CustomerTimeline, type TimelineItem } from '@/components/domain/CustomerTimeline';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { Button } from '@/components/primitives/button';
import { Card, CardContent } from '@/components/primitives/card';
import { requireOnboardedUser } from '@/lib/auth/session';
import { formatCents } from '@/lib/invoicing/money';
import {
  BILLING_PREFERENCE_LABEL,
  CUSTOMER_TYPE_LABEL,
  JOB_STATUS_LABEL,
  JOB_STATUS_TONE,
  OBJECT_TYPE_LABEL,
} from '@/lib/labels';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

import { archiveCustomer } from '../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Klant — ServOps',
};

type JobStatus = Database['public']['Enums']['job_status'];

interface CustomerBeurtRow {
  id: string;
  date: string;
  address: string;
  service: string;
  status: JobStatus;
}

interface CustomerObjectWithJobsRow {
  id: string;
  address_line1: string;
  service_agreements:
    | {
        id: string;
        services: { name: string } | null;
        jobs: { id: string; scheduled_date: string; status: JobStatus }[];
      }[]
    | null;
}

function formatBeurtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

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

  // "Beurten"-tab (voortbouwend op FR-007-richting, § 27 § 1.5): één query
  // objecten → dienstafspraken → beurten (in plaats van vanuit `jobs` terug te
  // filteren via geneste joins, wat fragielere PostgREST-filtersyntax vereist).
  const { data: objectsWithJobsRaw } = await supabase
    .from('objects')
    .select(
      // Expliciete FK-hint nodig: service_agreements↔jobs heeft twee relaties
      // (jobs.service_agreement_id én service_agreements.last_completed_job_id)
      // — zonder hint weigert PostgREST te embedden (PGRST201, ambigu).
      'id, address_line1, service_agreements(id, services(name), jobs!jobs_service_agreement_id_fkey(id, scheduled_date, status))',
    )
    .eq('customer_id', customer.id)
    .is('archived_at', null);
  const objectsWithJobs = (objectsWithJobsRaw ?? []) as unknown as CustomerObjectWithJobsRow[];

  const beurten: CustomerBeurtRow[] = (objectsWithJobs ?? []).flatMap((object) =>
    (object.service_agreements ?? []).flatMap((agreement) =>
      (agreement.jobs ?? []).map((job) => ({
        id: job.id,
        date: job.scheduled_date,
        address: object.address_line1,
        service: agreement.services?.name ?? '—',
        status: job.status,
      })),
    ),
  );
  beurten.sort((a, b) => b.date.localeCompare(a.date));

  // Tijdlijn-tab (FR-007, bewust verkleinde scope — zie CustomerTimeline.tsx):
  // beurten + facturen, chronologisch. Geen communicatie/niet-thuis-historie/
  // gebruiker-attributie — die data bestaat nergens in het schema (PRD § 19 A-29).
  const { data: customerInvoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, invoice_date, total_amount_cents')
    .eq('customer_id', customer.id)
    .order('invoice_date', { ascending: false });

  const INVOICE_STATUS_LABEL: Record<'draft' | 'sent' | 'paid', string> = {
    draft: 'Concept',
    sent: 'Verzonden',
    paid: 'Betaald',
  };

  const timelineItems: TimelineItem[] = [
    ...beurten.map((beurt) => ({
      id: beurt.id,
      kind: 'beurt' as const,
      date: beurt.date,
      label: `${beurt.service} — ${beurt.address}`,
      detail: JOB_STATUS_LABEL[beurt.status],
    })),
    ...(customerInvoices ?? []).map((invoice) => ({
      id: invoice.id,
      kind: 'factuur' as const,
      date: invoice.invoice_date,
      label: invoice.invoice_number ?? 'Conceptfactuur',
      detail: `${INVOICE_STATUS_LABEL[invoice.status]} — ${formatCents(invoice.total_amount_cents)}`,
      href: `/facturen/${invoice.id}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const todayIso = new Date().toISOString().slice(0, 10);
  const nextBeurt = [...beurten]
    .filter((beurt) => beurt.date >= todayIso && beurt.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const firstObjectId = objectsWithJobs?.[0]?.id;
  const addObjectOrAgreementHref = firstObjectId
    ? `/klanten/${customer.id}/objecten/${firstObjectId}`
    : `/klanten/${customer.id}/objecten/nieuw`;

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
      <p className="text-text-muted mb-4 text-sm">
        {nextBeurt ? (
          <>
            Volgende beurt:{' '}
            <span className="text-text font-medium">{formatBeurtDate(nextBeurt.date)}</span> —{' '}
            {nextBeurt.address} ({nextBeurt.service})
          </>
        ) : (
          <>
            Nog geen beurt gepland —{' '}
            <Link href={addObjectOrAgreementHref} className="underline">
              plan automatisch
            </Link>
          </>
        )}
      </p>
      <Tabs defaultValue="gegevens">
        <TabsList>
          <TabsTrigger value="gegevens">Gegevens</TabsTrigger>
          <TabsTrigger value="objecten">Objecten</TabsTrigger>
          <TabsTrigger value="beurten">Beurten</TabsTrigger>
          <TabsTrigger value="tijdlijn">Tijdlijn</TabsTrigger>
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
        <TabsContent value="beurten">
          <DataTable
            rows={beurten}
            getRowKey={(row) => row.id}
            emptyTitle="Nog geen beurten."
            emptyDescription="Beurten verschijnen hier zodra er een actieve dienstafspraak is."
            emptyAction={
              <Button asChild>
                <Link href={addObjectOrAgreementHref}>Plan automatisch</Link>
              </Button>
            }
            columns={[
              { header: 'Datum', cell: (row) => formatBeurtDate(row.date) },
              { header: 'Adres', cell: (row) => row.address },
              { header: 'Dienst', cell: (row) => row.service },
              {
                header: 'Status',
                cell: (row) => (
                  <span className="inline-flex items-center gap-1.5">
                    <StatusBadge
                      label={JOB_STATUS_LABEL[row.status]}
                      tone={JOB_STATUS_TONE[row.status]}
                    />
                    {row.status === 'completed' ? <Check className="text-success size-4" /> : null}
                  </span>
                ),
              },
            ]}
          />
        </TabsContent>
        <TabsContent value="tijdlijn">
          <CustomerTimeline items={timelineItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
