import Link from 'next/link';

import { DataTable } from '@/components/composed/DataTable';
import { PageHeader } from '@/components/composed/PageHeader';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { Button } from '@/components/primitives/button';
import { requireOnboardedUser } from '@/lib/auth/session';
import { FEATURE_REQUEST_STATUS_LABEL, FEATURE_REQUEST_STATUS_TONE } from '@/lib/labels';
import { createClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feature requests — ServOps',
};

/** Feature requests-overzicht (FR-950, 46_PlatformAdmin.md § 2) — eigen bedrijf, RLS-scoped. */
export default async function FeatureRequestsPage() {
  await requireOnboardedUser();
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from('feature_requests')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <PageHeader
        title="Feature requests"
        description="Verzoeken die jij hebt ingediend voor ServOps — we laten hier de status zien zodra we ernaar gekeken hebben."
        action={
          <Button asChild>
            <Link href="/instellingen/feature-requests/nieuw">Nieuwe feature request</Link>
          </Button>
        }
      />
      <DataTable
        rows={requests ?? []}
        getRowKey={(row) => row.id}
        emptyTitle="Nog geen feature requests ingediend."
        emptyDescription="Heb je een idee dat ServOps beter zou maken? Dien het in."
        emptyAction={
          <Button asChild>
            <Link href="/instellingen/feature-requests/nieuw">Nieuwe feature request</Link>
          </Button>
        }
        columns={[
          { header: 'Titel', cell: (row) => row.title },
          {
            header: 'Ingediend op',
            cell: (row) => new Date(row.created_at).toLocaleDateString('nl-NL'),
          },
          {
            header: 'Status',
            cell: (row) => (
              <StatusBadge
                label={FEATURE_REQUEST_STATUS_LABEL[row.status]}
                tone={FEATURE_REQUEST_STATUS_TONE[row.status]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
