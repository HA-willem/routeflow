import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/composed/PageHeader';
import { ProposalList } from '@/components/domain/briefing/ProposalList';
import type { PlanningJob } from '@/components/domain/JobCard';
import { AddJobDialog, PlanningBoard, PlanningWeekBoard } from '@/components/domain/RouteBoard';
import type { RouteColumn, WeekColumn } from '@/components/domain/RouteBoard';
import { Button } from '@/components/primitives/button';
import { requireOnboardedUser } from '@/lib/auth/session';
import { getOpenProposals } from '@/lib/briefing/proposals';
import {
  addDaysIso,
  formatDayHeading,
  formatWeekHeading,
  shortDayLabel,
  todayIso,
  weekDates,
} from '@/lib/planning/dates';
import { PLANNING_JOB_SELECT, toPlanningJob, type PlanningJobRow } from '@/lib/planning/jobs';
import { createClient } from '@/lib/supabase/server';

import { decideProposal } from '../briefing-actions';
import { searchCustomersForCommand } from '../command-actions';

import {
  addManualJob,
  fillDay,
  getCustomerObjectsForJob,
  getFillDayCandidates,
  moveJob,
  moveJobToDate,
  optimizeEmployeeDay,
  reportSickLeave,
} from './actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planning — ServOps',
};

interface PlanningPageProps {
  searchParams: Promise<{ view?: string; date?: string }>;
}

function dayColumnLabel(iso: string): string {
  const short = shortDayLabel(iso);
  return `${short.charAt(0).toUpperCase()}${short.slice(1)} ${iso.slice(8, 10)}`;
}

export default async function PlanningPage({ searchParams }: PlanningPageProps) {
  const { profile } = await requireOnboardedUser();
  const params = await searchParams;
  const view = params.view === 'dag' ? 'dag' : 'week';
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayIso();

  const supabase = await createClient();
  const days = weekDates(date);

  const [{ data: employees }, { data: services }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .is('archived_at', null)
      .order('first_name', { ascending: true }),
    supabase
      .from('services')
      .select('id, name')
      .eq('company_id', profile.company_id)
      .is('archived_at', null)
      .order('name', { ascending: true }),
  ]);

  // Eenmanszaak (ZZP'er, 1 actieve medewerker): een weekweergave met kolommen
  // per medewerker heeft dan niets om naast elkaar te zetten — een echte
  // weekgrid (kolommen per dag) is dan wél zinvol en maakt slepen tussen
  // dagen mogelijk (WeekBoard, § moveJobToDate). Bij meerdere medewerkers
  // blijft het bestaande kolom-per-medewerker/dag-model leidend (RouteBoard) —
  // een weekgrid dáár zou 7 dagen × N medewerkers worden, een andere,
  // grotere UI-vraag die niet is gesteld.
  const isSoleTrader = (employees ?? []).length === 1;
  const showWeekGrid = isSoleTrader && view === 'week';

  const [proposals, weekColumns, dayColumns] = await Promise.all([
    getOpenProposals(supabase, profile.company_id, { from: days[0]!, to: days[6]! }),
    showWeekGrid ? loadWeekColumns() : Promise.resolve(null),
    showWeekGrid ? Promise.resolve(null) : loadDayColumns(),
  ]);

  async function loadWeekColumns(): Promise<WeekColumn[]> {
    const employee = employees![0]!;
    const [{ data: routes }, { data: jobs }] = await Promise.all([
      supabase
        .from('routes')
        .select('id, route_date, total_work_time_minutes')
        .eq('company_id', profile.company_id)
        .eq('employee_id', employee.id)
        .gte('route_date', days[0]!)
        .lte('route_date', days[6]!),
      supabase
        .from('jobs')
        .select(PLANNING_JOB_SELECT)
        .eq('company_id', profile.company_id)
        .gte('scheduled_date', days[0]!)
        .lte('scheduled_date', days[6]!)
        .neq('status', 'cancelled')
        .not('route_id', 'is', null)
        .returns<PlanningJobRow[]>(),
    ]);

    const jobsByRoute = new Map<string, PlanningJob[]>();
    for (const row of jobs ?? []) {
      if (!row.route_id) continue;
      const list = jobsByRoute.get(row.route_id) ?? [];
      list.push(toPlanningJob(row));
      jobsByRoute.set(row.route_id, list);
    }
    const routeByDate = new Map((routes ?? []).map((route) => [route.route_date, route]));

    return days.map((day) => {
      const route = routeByDate.get(day) ?? null;
      const jobList = route ? (jobsByRoute.get(route.id) ?? []) : [];
      jobList.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
      return {
        date: day,
        dayLabel: dayColumnLabel(day),
        employeeId: employee.id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        routeId: route?.id ?? null,
        jobs: jobList,
        totalWorkMinutes: route?.total_work_time_minutes ?? 0,
      };
    });
  }

  async function loadDayColumns(): Promise<RouteColumn[]> {
    const [{ data: routes }, { data: jobs }] = await Promise.all([
      supabase
        .from('routes')
        .select('id, employee_id, total_work_time_minutes')
        .eq('company_id', profile.company_id)
        .eq('route_date', date),
      supabase
        .from('jobs')
        .select(PLANNING_JOB_SELECT)
        .eq('company_id', profile.company_id)
        .eq('scheduled_date', date)
        .neq('status', 'cancelled')
        .not('route_id', 'is', null)
        .returns<PlanningJobRow[]>(),
    ]);

    const jobsByRoute = new Map<string, PlanningJob[]>();
    for (const row of jobs ?? []) {
      if (!row.route_id) continue;
      const list = jobsByRoute.get(row.route_id) ?? [];
      list.push(toPlanningJob(row));
      jobsByRoute.set(row.route_id, list);
    }
    const routeByEmployee = new Map((routes ?? []).map((route) => [route.employee_id, route]));

    return (employees ?? []).map((employee) => {
      const route = routeByEmployee.get(employee.id) ?? null;
      const jobList = route ? (jobsByRoute.get(route.id) ?? []) : [];
      jobList.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
      return {
        employeeId: employee.id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        routeId: route?.id ?? null,
        jobs: jobList,
        totalWorkMinutes: route?.total_work_time_minutes ?? 0,
      };
    });
  }

  const heading = view === 'dag' ? formatDayHeading(date) : formatWeekHeading(date);

  return (
    <div>
      <PageHeader
        title="Planning"
        description={heading.charAt(0).toUpperCase() + heading.slice(1)}
        action={
          <div className="flex items-center gap-2">
            <AddJobDialog
              date={date}
              employees={(employees ?? []).map((employee) => ({
                id: employee.id,
                name: `${employee.first_name} ${employee.last_name}`,
              }))}
              services={services ?? []}
              searchCustomersAction={searchCustomersForCommand}
              getCustomerObjectsAction={getCustomerObjectsForJob}
              addManualJobAction={addManualJob}
            />
            <Button asChild variant="outline">
              <Link href="/planning/wachtrij">Herplan-wachtrij bekijken</Link>
            </Button>
          </div>
        }
      />

      {proposals.length > 0 ? (
        <div className="mb-6">
          <ProposalList
            proposals={proposals}
            aiPreview={false}
            decideProposalAction={decideProposal}
          />
        </div>
      ) : null}

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="border-border inline-flex w-fit gap-1 border-b">
          <Link
            href={`/planning?view=week&date=${date}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${view === 'week' ? 'border-primary text-text' : 'text-text-muted border-transparent'}`}
          >
            Week
          </Link>
          <Link
            href={`/planning?view=dag&date=${date}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${view === 'dag' ? 'border-primary text-text' : 'text-text-muted border-transparent'}`}
          >
            Dag
          </Link>
        </div>

        {view === 'dag' ? (
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="icon-sm">
              <Link
                href={`/planning?view=dag&date=${addDaysIso(date, -1)}`}
                aria-label="Vorige dag"
              >
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/planning?view=dag&date=${todayIso()}`}>Vandaag</Link>
            </Button>
            <Button asChild variant="outline" size="icon-sm">
              <Link
                href={`/planning?view=dag&date=${addDaysIso(date, 1)}`}
                aria-label="Volgende dag"
              >
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="icon-sm">
              <Link
                href={`/planning?view=week&date=${addDaysIso(date, -7)}`}
                aria-label="Vorige week"
              >
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon-sm">
              <Link
                href={`/planning?view=week&date=${addDaysIso(date, 7)}`}
                aria-label="Volgende week"
              >
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      {view === 'week' && !showWeekGrid ? (
        <div className="mb-4 flex gap-2">
          {days.map((day) => (
            <Link
              key={day}
              href={`/planning?view=dag&date=${day}`}
              className={`rounded-md border px-3 py-2 text-center text-xs font-medium ${
                day === date
                  ? 'border-primary bg-primary/10 text-text'
                  : 'border-border text-text-muted hover:bg-surface'
              }`}
            >
              <span className="block uppercase">{shortDayLabel(day)}</span>
              <span className="block tabular-nums">{day.slice(8, 10)}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {showWeekGrid ? (
        <PlanningWeekBoard
          columns={weekColumns!}
          moveJobAction={moveJobToDate}
          optimizeEmployeeDayAction={optimizeEmployeeDay}
          reportSickLeaveAction={reportSickLeave}
          getFillDayCandidatesAction={getFillDayCandidates}
          fillDayAction={fillDay}
        />
      ) : (
        <PlanningBoard
          companyId={profile.company_id}
          date={date}
          columns={dayColumns!}
          moveJobAction={moveJob}
          optimizeEmployeeDayAction={optimizeEmployeeDay}
          reportSickLeaveAction={reportSickLeave}
          getFillDayCandidatesAction={getFillDayCandidates}
          fillDayAction={fillDay}
        />
      )}
    </div>
  );
}
