import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArchiveConfirmButton } from '@/components/composed/ArchiveConfirmButton';
import { PageHeader } from '@/components/composed/PageHeader';
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
    </div>
  );
}
