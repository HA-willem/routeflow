'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Wand2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { JobCard, type PlanningJob } from '@/components/domain/JobCard';
import { Button } from '@/components/primitives/button';
import { EmptyState } from '@/components/primitives/empty-state';
import type { ActionResult } from '@/lib/errors';
import { cn } from '@/lib/utils';

import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

export interface RouteColumn {
  employeeId: string;
  employeeName: string;
  routeId: string | null;
  jobs: PlanningJob[];
  totalWorkMinutes: number;
}

export type MoveJobAction = (params: {
  jobId: string;
  targetRouteId: string;
  position: number;
}) => Promise<ActionResult<{ success: true }>>;

export type OptimizeEmployeeDayAction = (params: {
  employeeId: string;
  date: string;
}) => Promise<
  ActionResult<{ route: { id: string } | null; stops: unknown[]; unplaceable_job_ids: string[] }>
>;

interface RouteBoardProps {
  date: string;
  columns: RouteColumn[];
  onOpenRouteDetails?: (employeeId: string) => void;
  highlightedJobIds?: Set<string>;
  /** Server Actions (41_CodingStandards.md § 1: leven in app/(app)/planning/actions.ts — hier als prop
   * doorgegeven i.p.v. geïmporteerd, zodat components/domain nooit rechtstreeks van /app afhangt (§ 1 lagenregel). */
  moveJobAction: MoveJobAction;
  optimizeEmployeeDayAction: OptimizeEmployeeDayAction;
}

/** BR-202 werkdag-limiet (8,5u) — hier alleen als UI-preview-drempel voor de capaciteitsbalk (42_DesignSystem.md § 14); de harde grens wordt door route-move-job gehandhaafd. */
const MAX_WORKDAY_MINUTES = 510;

function CapacityBar({ minutes }: { minutes: number }) {
  const ratio = Math.min(minutes / MAX_WORKDAY_MINUTES, 1);
  const isNearLimit = ratio >= 0.9;
  return (
    <div className="bg-border mt-1.5 h-1 w-full overflow-hidden rounded-full">
      <div
        className={cn('h-full rounded-full', isNearLimit ? 'bg-warning' : 'bg-primary')}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

function DraggableJobCard({
  job,
  onOpenDetails,
  highlighted,
}: {
  job: PlanningJob;
  onOpenDetails?: () => void;
  highlighted?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: job.id,
    disabled: job.locked,
    data: { job },
  });

  return (
    <JobCard
      job={job}
      dragHandleRef={setNodeRef}
      dragAttributes={attributes}
      dragListeners={listeners}
      isDragging={isDragging}
      highlighted={highlighted}
      onClick={onOpenDetails}
      className={isDragging ? 'opacity-0' : undefined}
    />
  );
}

function Column({
  column,
  onOptimize,
  isOptimizing,
  onOpenDetails,
  highlightedJobIds,
}: {
  column: RouteColumn;
  onOptimize: () => void;
  isOptimizing: boolean;
  onOpenDetails?: () => void;
  highlightedJobIds?: Set<string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.employeeId, data: { column } });

  return (
    <div className="w-[280px] shrink-0 md:w-[240px] lg:w-[280px]">
      <div className="bg-surface border-border rounded-t-lg border border-b-0 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="bg-border text-text-muted flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
            {column.employeeName.charAt(0).toUpperCase()}
          </span>
          <p className="text-text flex-1 truncate text-sm font-semibold">{column.employeeName}</p>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Route optimaliseren voor ${column.employeeName}`}
            onClick={onOptimize}
            disabled={isOptimizing}
          >
            <Wand2 className="size-4" />
          </Button>
        </div>
        <p className="text-text-muted mt-1 text-xs tabular-nums">
          {column.jobs.length} {column.jobs.length === 1 ? 'beurt' : 'beurten'} ·{' '}
          {Math.floor(column.totalWorkMinutes / 60)}u {column.totalWorkMinutes % 60}m
        </p>
        <CapacityBar minutes={column.totalWorkMinutes} />
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'border-border min-h-[120px] space-y-2 rounded-b-lg border p-2',
          isOver && 'border-primary border-2',
        )}
      >
        {column.jobs.length === 0 ? (
          <p className="text-text-muted px-2 py-6 text-center text-xs">Geen beurten gepland.</p>
        ) : (
          column.jobs.map((job) => (
            <DraggableJobCard
              key={job.id}
              job={job}
              highlighted={highlightedJobIds?.has(job.id)}
              onOpenDetails={onOpenDetails ? () => onOpenDetails() : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * RouteBoard — 26_ComponentLibrary.md § 4, 42_DesignSystem.md § 14. Eén kolom per
 * medewerker voor één dag (de routing-engine optimaliseert per medewerker/dag,
 * 14_RoutingEngine.md § 4.1 — geen weekgrid-drag, dat is een engine-beperking,
 * geen UI-keuze). Drag-and-drop verplaatst een Beurt naar een andere route via
 * route-move-job (optimistic UI + rollback bij afwijzing, 24_UI_UX.md § 1.5).
 */
export function RouteBoard({
  date,
  columns,
  onOpenRouteDetails,
  highlightedJobIds,
  moveJobAction,
  optimizeEmployeeDayAction,
}: RouteBoardProps) {
  const [prevColumns, setPrevColumns] = useState(columns);
  const [columnsState, setColumnsState] = useState(columns);
  const [activeJob, setActiveJob] = useState<PlanningJob | null>(null);
  const [optimizingEmployeeId, setOptimizingEmployeeId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // NFR-602/PRD A-14: @dnd-kit is uitdrukkelijk gekozen om keyboard-drag te
    // ondersteunen (Space om op te pakken, pijltjes om te verplaatsen, Space
    // om neer te zetten, Escape om te annuleren) — zonder deze sensor is de
    // RouteBoard alleen met een muis te bedienen.
    useSensor(KeyboardSensor),
  );

  // Ververst lokale state wanneer de server (revalidatePath) nieuwe columns aanlevert
  // (optimalisatie/realtime) — tijdens render bijgewerkt i.p.v. in een effect, zodat er
  // geen extra gecascadeerde render optreedt (react-hooks/set-state-in-effect).
  if (columns !== prevColumns) {
    setPrevColumns(columns);
    setColumnsState(columns);
  }

  if (columnsState.length === 0) {
    return (
      <EmptyState
        title="Nog niets gepland."
        description="Voeg klanten met dienstafspraken toe; wij stellen de eerste week voor."
      />
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const job = event.active.data.current?.job as PlanningJob | undefined;
    setActiveJob(job ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null);
    const { active, over } = event;
    if (!over) return;

    const targetEmployeeId = over.id as string;
    const sourceColumn = columnsState.find((c) => c.jobs.some((j) => j.id === active.id));
    const targetColumn = columnsState.find((c) => c.employeeId === targetEmployeeId);
    if (!sourceColumn || !targetColumn || !targetColumn.routeId) return;
    if (sourceColumn.employeeId === targetColumn.employeeId) return;

    const job = sourceColumn.jobs.find((j) => j.id === active.id);
    if (!job || job.locked) return;

    const position = targetColumn.jobs.length;
    const previousColumns = columnsState;

    setColumnsState((prev) =>
      prev.map((col) => {
        if (col.employeeId === sourceColumn.employeeId) {
          return { ...col, jobs: col.jobs.filter((j) => j.id !== job.id) };
        }
        if (col.employeeId === targetColumn.employeeId) {
          return { ...col, jobs: [...col.jobs, { ...job, routeId: targetColumn.routeId }] };
        }
        return col;
      }),
    );

    const result = await moveJobAction({
      jobId: job.id,
      targetRouteId: targetColumn.routeId,
      position,
    });

    if (!result.success) {
      setColumnsState(previousColumns);
      toast.error(result.error.message);
      return;
    }

    toast.success(`Beurt verplaatst naar ${targetColumn.employeeName}.`, {
      action: {
        label: 'Ongedaan maken',
        onClick: async () => {
          if (!sourceColumn.routeId) return;
          const undoResult = await moveJobAction({
            jobId: job.id,
            targetRouteId: sourceColumn.routeId,
            position: sourceColumn.jobs.length,
          });
          if (!undoResult.success) {
            toast.error(undoResult.error.message);
          }
        },
      },
    });
  }

  async function handleOptimize(employeeId: string) {
    setOptimizingEmployeeId(employeeId);
    const result = await optimizeEmployeeDayAction({ employeeId, date });
    setOptimizingEmployeeId(null);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    const unplaceable = result.data.unplaceable_job_ids.length;
    if (unplaceable > 0) {
      toast.warning(`Route bijgewerkt. ${unplaceable} beurt(en) niet plaatsbaar.`);
    } else {
      toast.success(`Route bijgewerkt: ${result.data.stops.length} beurten gepland.`);
    }
  }

  return (
    <DndContext
      id="route-board"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columnsState.map((column) => (
          <Column
            key={column.employeeId}
            column={column}
            isOptimizing={optimizingEmployeeId === column.employeeId}
            onOptimize={() => handleOptimize(column.employeeId)}
            onOpenDetails={
              onOpenRouteDetails ? () => onOpenRouteDetails(column.employeeId) : undefined
            }
            highlightedJobIds={highlightedJobIds}
          />
        ))}
      </div>
      <DragOverlay>{activeJob ? <JobCard job={activeJob} isDragging /> : null}</DragOverlay>
    </DndContext>
  );
}
