'use client';

import { useRef, useState } from 'react';

import {
  RouteBoard,
  type MoveJobAction,
  type OptimizeEmployeeDayAction,
  type ReportSickLeaveAction,
  type RouteColumn,
} from '@/components/domain/RouteBoard/RouteBoard';
import { RouteDetailsDialog } from '@/components/domain/RouteDetailsDialog';
import { useRealtimeRoute } from '@/hooks/useRealtimeRoute';

/**
 * Hoe lang na een eigen mutatie realtime-events van jezelf genegeerd worden
 * (§ 15: de highlight-puls is voor wijzigingen door een collega, niet voor je
 * eigen actie) — ruim boven de typische Server Action + revalidatePath-round-trip.
 */
const SELF_MUTATION_SUPPRESS_MS = 4000;

interface PlanningBoardProps {
  companyId: string;
  date: string;
  columns: RouteColumn[];
  moveJobAction: MoveJobAction;
  optimizeEmployeeDayAction: OptimizeEmployeeDayAction;
  reportSickLeaveAction: ReportSickLeaveAction;
}

/**
 * PlanningBoard — samenstellende client-schil (41_CodingStandards.md § 6) rond
 * RouteBoard: koppelt de realtime-subscription (useRealtimeRoute) en de
 * route-details-dialog-state. Bevat zelf geen domeinlogica.
 */
export function PlanningBoard({
  companyId,
  date,
  columns,
  moveJobAction,
  optimizeEmployeeDayAction,
  reportSickLeaveAction,
}: PlanningBoardProps) {
  const [openEmployeeId, setOpenEmployeeId] = useState<string | null>(null);
  const suppressUntilRef = useRef(0);
  const { highlightedJobIds } = useRealtimeRoute(companyId, date, suppressUntilRef);

  const openColumn = columns.find((c) => c.employeeId === openEmployeeId) ?? null;

  const suppressedMoveJobAction: MoveJobAction = async (params) => {
    suppressUntilRef.current = Date.now() + SELF_MUTATION_SUPPRESS_MS;
    return moveJobAction(params);
  };
  const suppressedOptimizeEmployeeDayAction: OptimizeEmployeeDayAction = async (params) => {
    suppressUntilRef.current = Date.now() + SELF_MUTATION_SUPPRESS_MS;
    return optimizeEmployeeDayAction(params);
  };

  return (
    <>
      <RouteBoard
        date={date}
        columns={columns}
        highlightedJobIds={highlightedJobIds}
        onOpenRouteDetails={setOpenEmployeeId}
        moveJobAction={suppressedMoveJobAction}
        optimizeEmployeeDayAction={suppressedOptimizeEmployeeDayAction}
        reportSickLeaveAction={reportSickLeaveAction}
      />
      <RouteDetailsDialog
        column={openColumn}
        date={date}
        onOpenChange={(open) => !open && setOpenEmployeeId(null)}
      />
    </>
  );
}
