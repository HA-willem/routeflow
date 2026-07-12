import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/composed/PageHeader';
import { Werkbon } from '@/components/domain/Werkbon';
import { requireOnboardedUser } from '@/lib/auth/session';
import { getWerkbonData } from '@/lib/execution/werkbon';
import { createClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Werkbon — RouteFlow' };

/** Desktop-variant van de werkbon (planner/administratie) — zelfde databron als /m/beurt/[id]/werkbon. */
export default async function DesktopWerkbonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOnboardedUser();
  const { id } = await params;
  const supabase = await createClient();

  const data = await getWerkbonData(supabase, id);
  if (!data) {
    notFound();
  }

  return (
    <div>
      <PageHeader title="Werkbon" description={data.customerName} />
      <div className="max-w-2xl">
        <Werkbon data={data} />
      </div>
    </div>
  );
}
