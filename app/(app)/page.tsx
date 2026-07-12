import { PageHeader } from '@/components/composed/PageHeader';
import { KPICard } from '@/components/domain/KPICard';
import { EmptyState } from '@/components/primitives/empty-state';
import { requireOnboardedUser } from '@/lib/auth/session';
import { formatCents } from '@/lib/invoicing/money';
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeek(): string {
  const date = new Date();
  const day = (date.getDay() + 6) % 7; // 0 = maandag
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10);
}

/** Sprint 5-opdracht: uitgevoerd/open/omzet-vandaag/omzet-deze-week/concept/verzonden. */
export default async function DashboardPage() {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .single();

  const [
    { count: completedToday },
    { count: openJobs },
    { data: invoicesToday },
    { data: invoicesThisWeek },
    { count: draftInvoices },
    { count: sentInvoices },
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', `${today()}T00:00:00`),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['proposed', 'planned', 'en_route']),
    supabase.from('invoices').select('total_amount_cents').gte('created_at', `${today()}T00:00:00`),
    supabase
      .from('invoices')
      .select('total_amount_cents')
      .gte('created_at', `${startOfWeek()}T00:00:00`),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
  ]);

  const revenueToday = (invoicesToday ?? []).reduce((sum, row) => sum + row.total_amount_cents, 0);
  const revenueThisWeek = (invoicesThisWeek ?? []).reduce(
    (sum, row) => sum + row.total_amount_cents,
    0,
  );
  const hasData =
    (completedToday ?? 0) > 0 ||
    (openJobs ?? 0) > 0 ||
    (draftInvoices ?? 0) > 0 ||
    (sentInvoices ?? 0) > 0;

  const firstName = profile.full_name.split(' ')[0];

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName}.`}
        description={company ? company.name : undefined}
      />
      {hasData ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KPICard label="Uitgevoerd vandaag" value={String(completedToday ?? 0)} />
          <KPICard label="Open opdrachten" value={String(openJobs ?? 0)} />
          <KPICard label="Omzet vandaag" value={formatCents(revenueToday)} />
          <KPICard label="Omzet deze week" value={formatCents(revenueThisWeek)} />
          <KPICard label="Facturen concept" value={String(draftInvoices ?? 0)} />
          <KPICard label="Facturen verzonden" value={String(sentInvoices ?? 0)} />
        </div>
      ) : (
        <EmptyState
          title="Nog geen data."
          description="Zodra je klanten en dienstafspraken toevoegt, verschijnt hier je omzet, planning en openstaande facturen."
        />
      )}
    </div>
  );
}
