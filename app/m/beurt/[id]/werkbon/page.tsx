import { notFound } from 'next/navigation';

import { Werkbon } from '@/components/domain/Werkbon';
import { requireOnboardedUser } from '@/lib/auth/session';
import { getWerkbonData } from '@/lib/execution/werkbon';
import { createClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Werkbon — ServOps' };

export default async function WerkbonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOnboardedUser();
  const { id } = await params;
  const supabase = await createClient();

  const data = await getWerkbonData(supabase, id);
  if (!data) {
    notFound();
  }

  return (
    <div className="px-4 py-4">
      <Werkbon data={data} />
    </div>
  );
}
