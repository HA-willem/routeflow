'use client';

import { useState } from 'react';

import { RouteDetailsDialog } from '@/components/domain/RouteDetailsDialog';

import { WeekBoard, type MoveJobToDateAction, type WeekColumn } from './WeekBoard';

import type { OptimizeEmployeeDayAction, ReportSickLeaveAction, RouteColumn } from './RouteBoard';

interface PlanningWeekBoardProps {
  columns: WeekColumn[];
  moveJobAction: MoveJobToDateAction;
  optimizeEmployeeDayAction: OptimizeEmployeeDayAction;
  reportSickLeaveAction: ReportSickLeaveAction;
}

/**
 * PlanningWeekBoard — client-schil rond WeekBoard, analoog aan PlanningBoard
 * (koppelt de route-details-dialog-state). `RouteDetailsDialog` verwacht een
 * `RouteColumn` (medewerker-gekeyed) — bij één medewerker per dag is dat
 * gewoon de dagkolom onder een andere naam, dus hier omgezet i.p.v. de dialog
 * zelf een tweede vorm te leren kennen.
 */
export function PlanningWeekBoard({
  columns,
  moveJobAction,
  optimizeEmployeeDayAction,
  reportSickLeaveAction,
}: PlanningWeekBoardProps) {
  const [openDate, setOpenDate] = useState<string | null>(null);

  const openColumn = columns.find((c) => c.date === openDate) ?? null;
  const openColumnForDialog: RouteColumn | null = openColumn
    ? {
        employeeId: openColumn.employeeId,
        employeeName: openColumn.employeeName,
        routeId: openColumn.routeId,
        jobs: openColumn.jobs,
        totalWorkMinutes: openColumn.totalWorkMinutes,
      }
    : null;

  return (
    <>
      <WeekBoard
        columns={columns}
        onOpenRouteDetails={setOpenDate}
        moveJobAction={moveJobAction}
        optimizeEmployeeDayAction={optimizeEmployeeDayAction}
        reportSickLeaveAction={reportSickLeaveAction}
      />
      <RouteDetailsDialog
        column={openColumnForDialog}
        date={openDate ?? ''}
        onOpenChange={(open) => !open && setOpenDate(null)}
      />
    </>
  );
}
