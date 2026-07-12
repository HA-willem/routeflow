'use client';

import { Wand2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { JobCard, type PlanningJob } from '@/components/domain/JobCard';
import type { OptimizeEmployeeDayAction } from '@/components/domain/RouteBoard';
import { Button } from '@/components/primitives/button';
import { EmptyState } from '@/components/primitives/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives/select';

export interface WachtrijEmployee {
  id: string;
  name: string;
}

interface WachtrijBoardProps {
  jobs: PlanningJob[];
  employees: WachtrijEmployee[];
  /** Server Action, doorgegeven vanuit de pagina i.p.v. geïmporteerd (zie RouteBoard.tsx). */
  optimizeEmployeeDayAction: OptimizeEmployeeDayAction;
}

/**
 * WachtrijBoard — Herplan-wachtrij (27_PaginaOverzicht.md § 1.3, ReplanDiff-lite).
 * De AI Planner-distributielaag (dag-over-medewerkers-verdeling, 15_AIPlanner.md
 * § 1.2) is nog niet gebouwd — "Auto-herplan" gebruikt daarom uitsluitend de
 * bestaande route-optimize-Edge-Function per (medewerker, datum): de planner
 * kiest zelf een medewerker per beurt, waarna optimalisatie alle nog niet-
 * geroute beurten van die dag voor die medewerker meeneemt.
 */
export function WachtrijBoard({ jobs, employees, optimizeEmployeeDayAction }: WachtrijBoardProps) {
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);

  if (jobs.length === 0) {
    return <EmptyState title="Alles gepland — niets in de wachtrij. Mooi." />;
  }

  const pairs = new Map<string, { employeeId: string; date: string }>();
  for (const job of jobs) {
    const employeeId = selection[job.id];
    if (employeeId) {
      pairs.set(`${employeeId}-${job.scheduledDate}`, { employeeId, date: job.scheduledDate });
    }
  }

  async function runAutoHerplan() {
    setIsRunning(true);

    // Elk (medewerker, datum)-paar optimaliseert een onafhankelijke route —
    // parallel uitvoeren i.p.v. na elkaar wachten (geen gedeelde schrijfstate
    // tussen paren; route-optimize werkt altijd op precies één medewerker/dag).
    const results = await Promise.allSettled(
      Array.from(pairs.values()).map((pair) => optimizeEmployeeDayAction(pair)),
    );

    let placed = 0;
    let unplaceable = 0;
    let failed = 0;
    for (const result of results) {
      if (result.status === 'rejected' || !result.value.success) {
        failed += 1;
        continue;
      }
      placed += result.value.data.stops.length;
      unplaceable += result.value.data.unplaceable_job_ids.length;
    }

    setIsRunning(false);
    setSelection({});

    if (failed > 0) {
      toast.error(`${failed} herplanning(en) mislukt. Probeer het opnieuw.`);
    } else if (unplaceable > 0) {
      toast.warning(`Herpland: ${placed} beurten geplaatst, ${unplaceable} nog niet plaatsbaar.`);
    } else {
      toast.success(`Herpland: ${placed} beurten geplaatst.`);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={runAutoHerplan} disabled={pairs.size === 0 || isRunning}>
          <Wand2 className="size-4" />
          Auto-herplan
        </Button>
      </div>
      <ul className="space-y-2">
        {jobs.map((job) => (
          <li key={job.id}>
            <JobCard
              job={job}
              action={
                <div className="mt-2 flex items-center gap-2">
                  <Select
                    value={selection[job.id] ?? ''}
                    onValueChange={(value) =>
                      setSelection((prev) => ({ ...prev, [job.id]: value }))
                    }
                  >
                    <SelectTrigger size="sm" className="flex-1">
                      <SelectValue placeholder="Kies medewerker" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
