import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArchiveConfirmButton } from '@/components/composed/ArchiveConfirmButton';
import { PageHeader } from '@/components/composed/PageHeader';
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
    </div>
  );
}
