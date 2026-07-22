import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/composed/PageHeader';
import { KPICard } from '@/components/domain/KPICard';
import { EmptyState } from '@/components/primitives/empty-state';
import { requireOnboardedUser } from '@/lib/auth/session';
import { formatCents } from '@/lib/invoicing/money';
import { todayIso, weekDates } from '@/lib/planning/dates';
import { createClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — ServOps',
};

function startOfMonthIso(): string {
  return `${todayIso().slice(0, 8)}01`;
}

/**
 * KPI-dashboard (28_Dashboard.md) — het rustige cijferbeeld, gegroepeerd per
 * thema (vandaag/omzet/facturen). Sinds de Morning Briefing het startscherm is
 * (ADR-011 § 1) leeft dit overzicht op een eigen route; de AI-inhoud zelf
 * blijft op de briefing en wordt hier alleen aangewezen.
 */
export default async function DashboardPage() {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();
  const today = todayIso();
  const week = weekDates(today);

  const [
    { data: company },
    { count: jobsTodayTotal },
    { count: completedToday },
    { count: openJobs },
    { count: jobsThisWeek },
    { data: invoicesToday },
    { data: invoicesThisWeek },
    { data: invoicesThisMonth },
    { count: draftInvoices },
    { count: sentInvoices },
    { count: paidInvoices },
  ] = await Promise.all([
    supabase.from('companies').select('name').eq('id', profile.company_id).single(),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', today)
      .neq('status', 'cancelled'),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', `${today}T00:00:00`),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['proposed', 'planned', 'en_route']),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_date', week[0]!)
      .lte('scheduled_date', week[6]!)
      .neq('status', 'cancelled'),
    supabase.from('invoices').select('total_amount_cents').gte('created_at', `${today}T00:00:00`),
    supabase
      .from('invoices')
      .select('total_amount_cents')
      .gte('created_at', `${week[0]!}T00:00:00`),
    supabase
      .from('invoices')
      .select('total_amount_cents')
      .gte('created_at', `${startOfMonthIso()}T00:00:00`),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
  ]);

  const sum = (rows: Array<{ total_amount_cents: number }> | null) =>
    (rows ?? []).reduce((total, row) => total + row.total_amount_cents, 0);

  const revenueToday = sum(invoicesToday);
  const revenueThisWeek = sum(invoicesThisWeek);
  const revenueThisMonth = sum(invoicesThisMonth);
  const progressPct =
    (jobsTodayTotal ?? 0) > 0
      ? Math.round(((completedToday ?? 0) / (jobsTodayTotal ?? 1)) * 100)
      : 0;

  const hasData =
    (jobsTodayTotal ?? 0) > 0 ||
    (openJobs ?? 0) > 0 ||
    (draftInvoices ?? 0) > 0 ||
    (sentInvoices ?? 0) > 0 ||
    (paidInvoices ?? 0) > 0;

  if (!hasData) {
    return (
      <div>
        <PageHeader title="Dashboard" description={company ? company.name : undefined} />
        <EmptyState
          title="Nog geen data."
          description="Zodra je klanten en dienstafspraken toevoegt, verschijnt hier je omzet, planning en openstaande facturen."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" description={company ? company.name : undefined} />

      <div className="flex flex-col gap-8">
        <section aria-label="Vandaag" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-text text-sm font-semibold">Vandaag</h2>
            <p className="text-text-muted text-xs tabular-nums">
              {completedToday ?? 0} van {jobsTodayTotal ?? 0} beurten uitgevoerd
            </p>
          </div>
          <div aria-hidden className="bg-border h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPICard
              label="Uitgevoerd vandaag"
              value={String(completedToday ?? 0)}
              tone="success"
            />
            <KPICard label="Open opdrachten" value={String(openJobs ?? 0)} tone="warning" />
            <KPICard label="Beurten deze week" value={String(jobsThisWeek ?? 0)} tone="info" />
            <KPICard label="Omzet vandaag" value={formatCents(revenueToday)} tone="primary" />
          </div>
        </section>

        <section aria-label="Omzet" className="flex flex-col gap-3">
          <h2 className="text-text text-sm font-semibold">Omzet</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPICard label="Deze week" value={formatCents(revenueThisWeek)} tone="info" />
            <KPICard label="Deze maand" value={formatCents(revenueThisMonth)} tone="primary" />
          </div>
        </section>

        <section aria-label="Facturen" className="flex flex-col gap-3">
          <h2 className="text-text text-sm font-semibold">Facturen</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPICard label="Concept" value={String(draftInvoices ?? 0)} tone="warning" />
            <KPICard label="Verzonden" value={String(sentInvoices ?? 0)} tone="info" />
            <KPICard label="Betaald" value={String(paidInvoices ?? 0)} tone="success" />
          </div>
        </section>

        <Link
          href="/"
          className="group border-border bg-surface hover:border-primary/40 flex items-center gap-3 rounded-lg border p-4 transition-colors duration-150"
        >
          <Sparkles aria-hidden className="text-primary size-4 shrink-0" />
          <span className="text-text flex-1 text-sm">
            AI-inzichten en voorstellen staan in je Morning Briefing.
          </span>
          <span className="text-text-muted group-hover:text-primary flex items-center gap-1 text-xs font-medium transition-colors duration-150">
            Naar Vandaag
            <ArrowRight aria-hidden className="size-3" />
          </span>
        </Link>
      </div>
    </div>
  );
}
