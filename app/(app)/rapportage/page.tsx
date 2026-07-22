import { redirect } from 'next/navigation';

import { DataTable } from '@/components/composed/DataTable';
import { DateRangePicker } from '@/components/composed/DateRangePicker';
import { PageHeader } from '@/components/composed/PageHeader';
import { KPICard } from '@/components/domain/KPICard';
import { RevenueChart } from '@/components/domain/reporting/RevenueChart';
import { RevenueExportButton } from '@/components/domain/reporting/RevenueExportButton';
import {
  aggregateProductivityByEmployee,
  aggregateRevenueByMonth,
  summarizeRouteEfficiency,
} from '@/lib/analytics/reporting';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Rapportage — ServOps' };

interface JobWithRoute {
  id: string;
  routes: {
    employee_id: string;
    employees: { first_name: string; last_name: string } | null;
  } | null;
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 5, 1);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/**
 * Rapportage — Sprint 10 (`40_Implementatieplan.md` § Sprint 10). Rolgrens
 * volgt de al-bestaande navigatieconfiguratie (`lib/navigation.ts`:
 * `Rapportage` staat alleen open voor owner/admin) — geen aparte,
 * nieuw-verzonnen rolscheiding voor deze pagina.
 */
export default async function RapportagePage({
  searchParams,
}: {
  searchParams: Promise<{ van?: string; tot?: string }>;
}) {
  const { profile } = await requireOnboardedUser();
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    redirect('/');
  }

  const params = await searchParams;
  const defaults = defaultRange();
  const from = params.van || defaults.from;
  const to = params.tot || defaults.to;
  const toEndOfDay = `${to}T23:59:59.999`;

  const supabase = await createClient();

  const [{ data: invoices }, { data: routes }, { data: jobs }] = await Promise.all([
    supabase
      .from('invoices')
      .select('invoice_date, total_amount_cents, status')
      .gte('invoice_date', from)
      .lte('invoice_date', to)
      .in('status', ['sent', 'paid']),
    supabase
      .from('routes')
      .select('total_distance_meters, total_drive_time_minutes, optimization_score')
      .gte('route_date', from)
      .lte('route_date', to),
    supabase
      .from('jobs')
      .select('id, completed_at, routes(employee_id, employees(first_name, last_name))')
      .eq('status', 'completed')
      .gte('completed_at', from)
      .lte('completed_at', toEndOfDay),
  ]);

  const revenuePoints = aggregateRevenueByMonth(invoices ?? []);
  const routeSummary = summarizeRouteEfficiency(routes ?? []);
  const productivityRows = aggregateProductivityByEmployee(
    ((jobs ?? []) as unknown as JobWithRoute[])
      .filter((job) => job.routes?.employees)
      .map((job) => ({
        employeeId: job.routes!.employee_id,
        employeeName: `${job.routes!.employees!.first_name} ${job.routes!.employees!.last_name}`,
      })),
  );

  return (
    <div>
      <PageHeader title="Rapportage" description="Omzet, route-efficiëntie en productiviteit" />
      <DateRangePicker />

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-text text-lg font-semibold">Omzet</h2>
          <RevenueExportButton points={revenuePoints} />
        </div>
        <RevenueChart points={revenuePoints} />
      </section>

      <section className="mb-8">
        <h2 className="text-text mb-3 text-lg font-semibold">Route-efficiëntie</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KPICard label="Routes" value={String(routeSummary.routeCount)} />
          <KPICard
            label="Gem. afstand"
            value={
              routeSummary.avgDistanceMeters !== null
                ? `${(routeSummary.avgDistanceMeters / 1000).toFixed(1)} km`
                : '—'
            }
          />
          <KPICard
            label="Gem. rijtijd"
            value={
              routeSummary.avgDriveTimeMinutes !== null
                ? `${Math.round(routeSummary.avgDriveTimeMinutes)} min`
                : '—'
            }
          />
          <KPICard
            label="Gem. optimalisatiescore"
            value={
              routeSummary.avgOptimizationScore !== null
                ? routeSummary.avgOptimizationScore.toFixed(0)
                : '—'
            }
          />
        </div>
      </section>

      <section>
        <h2 className="text-text mb-3 text-lg font-semibold">Productiviteit</h2>
        <DataTable
          rows={productivityRows}
          getRowKey={(row) => row.employeeId}
          emptyTitle="Geen voltooide beurten in deze periode."
          columns={[
            { header: 'Medewerker', cell: (row) => row.employeeName },
            { header: 'Voltooide beurten', cell: (row) => String(row.completedJobs) },
          ]}
        />
      </section>
    </div>
  );
}
