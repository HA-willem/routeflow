import { PageHeader } from '@/components/composed/PageHeader';
import { EmptyState } from '@/components/primitives/empty-state';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — RouteFlow',
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Goedemorgen';
  if (hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

export default async function DashboardPage() {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .single();

  const firstName = profile.full_name.split(' ')[0];

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName}.`}
        description={company ? company.name : undefined}
      />
      {/*
       * 28_Dashboard.md § 4 (Empty, nieuw bedrijf): er zijn in Sprint 1 nog geen
       * klanten/beurten/facturen-tabellen (die landen vanaf Sprint 2/5) — dit is dus
       * de correcte, altijd-ware lege staat, geen placeholder. De actieknop "Naar
       * klanten" wordt aangesloten zodra /klanten bestaat (Sprint 2).
       */}
      <EmptyState
        title="Nog geen data."
        description="Zodra je klanten en dienstafspraken toevoegt, verschijnt hier je omzet, planning en openstaande facturen."
      />
    </div>
  );
}
