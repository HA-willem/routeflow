import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/composed/PageHeader';
import type { PlanningJob } from '@/components/domain/JobCard';
import { PlanningBoard } from '@/components/domain/RouteBoard';
import type { RouteColumn } from '@/components/domain/RouteBoard';
import { Button } from '@/components/primitives/button';
import { requireOnboardedUser } from '@/lib/auth/session';
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

import { moveJob, optimizeEmployeeDay, reportSickLeave } from './actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planning — RouteFlow',
};

interface PlanningPageProps {
  searchParams: Promise<{ view?: string; date?: string }>;
}

export default async function PlanningPage({ searchParams }: PlanningPageProps) {
  const { profile } = await requireOnboardedUser();
  const params = await searchParams;
  const view = params.view === 'dag' ? 'dag' : 'week';
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayIso();

  const supabase = await createClient();

  const [{ data: employees }, { data: routes }, { data: jobs }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .is('archived_at', null)
      .order('first_name', { ascending: true }),
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

  const columns: RouteColumn[] = (employees ?? []).map((employee) => {
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

  const days = weekDates(date);
  const heading = view === 'dag' ? formatDayHeading(date) : formatWeekHeading(date);

  return (
    <div>
      <PageHeader
        title="Planning"
        description={heading.charAt(0).toUpperCase() + heading.slice(1)}
        action={
          <Button asChild variant="outline">
            <Link href="/planning/wachtrij">Herplan-wachtrij bekijken</Link>
          </Button>
        }
      />

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

      {view === 'week' ? (
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

      <PlanningBoard
        companyId={profile.company_id}
        date={date}
        columns={columns}
        moveJobAction={moveJob}
        optimizeEmployeeDayAction={optimizeEmployeeDay}
        reportSickLeaveAction={reportSickLeave}
      />
    </div>
  );
}
