import { PageHeader } from '@/components/composed/PageHeader';
import { WachtrijBoard } from '@/components/domain/WachtrijBoard';
import { requireOnboardedUser } from '@/lib/auth/session';
import { todayIso } from '@/lib/planning/dates';
import { PLANNING_JOB_SELECT, toPlanningJob, type PlanningJobRow } from '@/lib/planning/jobs';
import { createClient } from '@/lib/supabase/server';

import { optimizeEmployeeDay } from '../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Herplan-wachtrij — RouteFlow',
};

/**
 * Herplan-wachtrij — 27_PaginaOverzicht.md § 1.3. Beurten die nog niet aan een
 * route hangen (`route_id IS NULL`), actief en op of na vandaag. De volledige
 * AI Planner-reactieve laag (weer/ziekmelding-triggers, diff-voorstellen,
 * 15_AIPlanner.md § 7) is Sprint 7-scope — deze pagina biedt de Sprint 4-
 * frontend-schil rond de bestaande route-optimize-Edge-Function (WachtrijBoard).
 */
export default async function WachtrijPage() {
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const [{ data: jobs }, { data: employees }] = await Promise.all([
    supabase
      .from('jobs')
      .select(PLANNING_JOB_SELECT)
      .eq('company_id', profile.company_id)
      .is('route_id', null)
      .gte('scheduled_date', todayIso())
      .in('status', ['proposed', 'planned', 'not_home', 'rescheduling'])
      .order('scheduled_date', { ascending: true })
      .returns<PlanningJobRow[]>(),
    supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .is('archived_at', null)
      .order('first_name', { ascending: true }),
  ]);

  return (
    <div>
      <PageHeader
        title="Herplan-wachtrij"
        description="Beurten die nog niet aan een route hangen."
      />
      <WachtrijBoard
        jobs={(jobs ?? []).map(toPlanningJob)}
        employees={(employees ?? []).map((e) => ({
          id: e.id,
          name: `${e.first_name} ${e.last_name}`,
        }))}
        optimizeEmployeeDayAction={optimizeEmployeeDay}
      />
    </div>
  );
}
