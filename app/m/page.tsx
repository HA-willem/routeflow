import { ChevronRight, CloudRain } from 'lucide-react';
import Link from 'next/link';

import { AiPreviewBadge } from '@/components/domain/briefing/AiPreviewBadge';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { EmptyState } from '@/components/primitives/empty-state';
import { requireOnboardedUser } from '@/lib/auth/session';
import { buildDemoWeather } from '@/lib/briefing/demo';
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

/**
 * Dagroute /m (home) — 29_MobieleApp.md § 2.1; tevens de Medewerker-variant van
 * de Morning Briefing (44_MorningBriefing_UX.md § 2.3): een kleine, persoonlijke
 * dagstart — eigen route, voortgang en weer-impact op de eigen stops. Geen
 * bedrijfsbrede KPI's, collega's of omzet (P1/P2, 23_Gebruikersrollen.md § 3).
 */
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
  const doneCount = jobs.filter(
    (job) => job.status === 'completed' || job.status === 'invoiced',
  ).length;
  const progressPct = jobs.length > 0 ? Math.round((doneCount / jobs.length) * 100) : 0;

  // Persoonlijke weer-impact op de eigen route (44 § 2.3) — voorbeeldweergave
  // tot de Weather Agent (Sprint 7) live is, zelfde bron als de desktop-briefing.
  const weather = buildDemoWeather({
    dateIso: today(),
    jobsToday: jobs.length,
    queueSize: 0,
    employeesAvailable: 1,
    routes: [],
  });
  const rainHour = weather.hours.find((h) => h.precipitationChance >= 70)?.hour ?? null;

  return (
    <div className="px-4 py-4 md:px-6">
      <h1 className="text-text text-lg font-semibold md:text-xl">
        {greeting()}, {profile.full_name.split(' ')[0]}!
      </h1>
      <p className="text-text-muted text-sm">
        {jobs.length === 0 ? 'Geen beurten vandaag.' : `Vandaag ${jobs.length} beurten.`}
      </p>

      {jobs.length > 0 ? (
        <div className="mt-3 flex items-center gap-3">
          <div aria-hidden className="bg-border h-1.5 flex-1 overflow-hidden rounded-full">
            <div
              className="bg-success h-full rounded-full transition-[width] duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-text-muted shrink-0 text-xs tabular-nums">
            {doneCount} van {jobs.length} afgerond
          </p>
        </div>
      ) : null}

      {jobs.length > 0 && rainHour !== null ? (
        <p className="border-border bg-surface text-text mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
          <CloudRain aria-hidden className="text-info size-4 shrink-0" />
          <span className="flex-1">
            Regen vanaf {rainHour}:00 — je latere stops kunnen nat worden.
          </span>
          <AiPreviewBadge />
        </p>
      ) : null}

      {jobs.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Je hebt vandaag geen beurten." description="Geniet van je dag!" />
        </div>
      ) : (
        <ol className="mt-4 flex flex-col gap-2">
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
                  className="border-border bg-bg focus-visible:outline-primary active:bg-surface flex min-h-16 items-center gap-3 rounded-lg border px-3 py-3 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 md:px-4 md:py-4"
                >
                  <span className="bg-surface text-text-muted flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums md:size-10">
                    {job.sequence ?? '—'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-text truncate text-sm font-medium md:text-base">
                      {object?.customers?.name ?? 'Onbekende klant'}
                    </p>
                    <p className="text-text-muted truncate text-xs md:text-sm">
                      {object?.address_line1 ?? '—'}, {object?.city ?? ''}
                    </p>
                    <p className="text-text-muted text-xs">
                      {agreement?.services?.name ?? 'Dienst'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-text text-xs font-medium tabular-nums md:text-sm">
                      {formatClockTime(job.service_start)}
                    </p>
                    <StatusBadge
                      label={JOB_STATUS_LABEL[job.status]}
                      tone={JOB_STATUS_TONE[job.status]}
                      className="mt-1"
                    />
                  </div>
                  <ChevronRight aria-hidden className="text-text-muted size-4 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
