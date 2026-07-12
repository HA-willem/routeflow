import Link from 'next/link';

import { StatusBadge } from '@/components/domain/StatusBadge';
import { EmptyState } from '@/components/primitives/empty-state';
import { requireOnboardedUser } from '@/lib/auth/session';
import { JOB_STATUS_LABEL, JOB_STATUS_TONE } from '@/lib/labels';
import { formatClockTime } from '@/lib/planning/dates';
import { createClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dagroute — RouteFlow' };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Goedemorgen';
  if (hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Dagroute /m (home) — 29_MobieleApp.md § 2.1. */
export default async function DagroutePage() {
  const { user, profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from('employees')
    .select('id, first_name')
    .eq('user_id', user.id)
    .single();

  if (!employee) {
    return <EmptyState title="Geen medewerker-profiel gevonden." />;
  }

  const { data: route } = await supabase
    .from('routes')
    .select('id')
    .eq('employee_id', employee.id)
    .eq('route_date', today())
    .maybeSingle();

  const { data: jobRows } = route
    ? await supabase
        .from('jobs')
        .select(
          `id, status, sequence, service_start, service_end,
           service_agreements!jobs_service_agreement_id_fkey(
             services!service_agreements_service_id_fkey(name),
             objects!service_agreements_object_id_fkey(address_line1, city, customers!objects_customer_id_fkey(name))
           )`,
        )
        .eq('route_id', route.id)
        .order('sequence')
    : { data: [] };

  const jobs = jobRows ?? [];

  return (
    <div className="px-4 py-4">
      <h1 className="text-text text-lg font-semibold">
        {greeting()}, {profile.full_name.split(' ')[0]}!
      </h1>
      <p className="text-text-muted text-sm">
        {jobs.length === 0 ? 'Geen beurten vandaag.' : `Vandaag ${jobs.length} beurten.`}
      </p>

      {jobs.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Je hebt vandaag geen beurten." description="Geniet van je dag!" />
        </div>
      ) : (
        <ol className="divide-border mt-4 divide-y">
          {jobs.map((job) => {
            const agreement = job.service_agreements as {
              services: { name: string } | null;
              objects: {
                address_line1: string;
                city: string;
                customers: { name: string } | null;
              } | null;
            } | null;
            const object = agreement?.objects ?? null;
            return (
              <li key={job.id}>
                <Link
                  href={`/m/beurt/${job.id}`}
                  className="focus-visible:outline-primary flex items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="bg-surface text-text-muted flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums">
                    {job.sequence ?? '—'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-text truncate text-sm font-medium">
                      {object?.customers?.name ?? 'Onbekende klant'}
                    </p>
                    <p className="text-text-muted truncate text-xs">
                      {object?.address_line1 ?? '—'}, {object?.city ?? ''}
                    </p>
                    <p className="text-text-muted text-xs">
                      {agreement?.services?.name ?? 'Dienst'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-text text-xs font-medium tabular-nums">
                      {formatClockTime(job.service_start)}
                    </p>
                    <StatusBadge
                      label={JOB_STATUS_LABEL[job.status]}
                      tone={JOB_STATUS_TONE[job.status]}
                      className="mt-1"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
