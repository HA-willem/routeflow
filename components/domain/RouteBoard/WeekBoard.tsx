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
import { UserX, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { JobCard, type PlanningJob } from '@/components/domain/JobCard';
import { Button } from '@/components/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/primitives/dialog';
import type { ActionResult } from '@/lib/errors';
import { cn } from '@/lib/utils';

import type { OptimizeEmployeeDayAction, ReportSickLeaveAction } from './RouteBoard';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

export interface WeekColumn {
  date: string;
  dayLabel: string;
  employeeId: string;
  employeeName: string;
  routeId: string | null;
  jobs: PlanningJob[];
  totalWorkMinutes: number;
}

export type MoveJobToDateAction = (params: {
  jobId: string;
  employeeId: string;
  targetDate: string;
  position: number;
}) => Promise<ActionResult<{ success: true }>>;

interface WeekBoardProps {
  columns: WeekColumn[];
  onOpenRouteDetails?: (date: string) => void;
  moveJobAction: MoveJobToDateAction;
  optimizeEmployeeDayAction: OptimizeEmployeeDayAction;
  reportSickLeaveAction: ReportSickLeaveAction;
}

/** Zelfde BR-202-preview-drempel als RouteBoard.tsx — bewust gedupliceerd i.p.v. geïmporteerd (kleine, stabiele constante, geen gedeelde module-afhankelijkheid waard). */
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
}: {
  job: PlanningJob;
  onOpenDetails?: () => void;
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
      onClick={onOpenDetails}
      className={isDragging ? 'opacity-0' : undefined}
    />
  );
}

function DayColumn({
  column,
  onOptimize,
  isOptimizing,
  onReportSick,
  isReportingSick,
  onOpenDetails,
}: {
  column: WeekColumn;
  onOptimize: () => void;
  isOptimizing: boolean;
  onReportSick: () => void;
  isReportingSick: boolean;
  onOpenDetails?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.date, data: { column } });
  const [confirmSickOpen, setConfirmSickOpen] = useState(false);

  return (
    <div className="w-[280px] shrink-0 md:w-[240px] lg:w-[280px]">
      <div className="bg-surface border-border rounded-t-lg border border-b-0 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-text flex-1 truncate text-sm font-semibold">{column.dayLabel}</p>
          <Dialog open={confirmSickOpen} onOpenChange={setConfirmSickOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${column.employeeName} ziek/verlof melden op ${column.dayLabel}`}
                disabled={isReportingSick}
              >
                <UserX className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {column.employeeName} ziek/verlof melden op {column.dayLabel}?
                </DialogTitle>
                <DialogDescription>
                  Dit genereert een herplanvoorstel voor de beurten van die dag — de beurten worden
                  pas daadwerkelijk verplaatst nadat je dat voorstel goedkeurt (BR-702).
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmSickOpen(false)}
                  disabled={isReportingSick}
                >
                  Annuleren
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onReportSick();
                    setConfirmSickOpen(false);
                  }}
                  disabled={isReportingSick}
                >
                  {isReportingSick ? 'Bezig…' : 'Ziek/verlof melden'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Route optimaliseren voor ${column.dayLabel}`}
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
              onOpenDetails={onOpenDetails ? () => onOpenDetails() : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * WeekBoard — weekweergave voor eenmanszaken (één actieve medewerker): kolommen
 * per dag i.p.v. per medewerker, zodat je beurten tussen dagen kunt slepen.
 * RouteBoard.tsx blijft ongewijzigd voor bedrijven met meerdere medewerkers
 * (daar blijft het kolom-per-medewerker/dag-model leidend — de routing-engine
 * optimaliseert nog steeds per medewerker/dag, 14_RoutingEngine.md § 4.1; deze
 * component verplaatst alleen *welke* dag een beurt hoort, niet hoe een dag
 * intern gerouteerd wordt). Geen realtime-subscription (v1-scope, `useRealtimeRoute`
 * is per-dag geschreven; een week-brede variant is een latere uitbreiding).
 */
export function WeekBoard({
  columns,
  onOpenRouteDetails,
  moveJobAction,
  optimizeEmployeeDayAction,
  reportSickLeaveAction,
}: WeekBoardProps) {
  const [prevColumns, setPrevColumns] = useState(columns);
  const [columnsState, setColumnsState] = useState(columns);
  const [activeJob, setActiveJob] = useState<PlanningJob | null>(null);
  const [optimizingDate, setOptimizingDate] = useState<string | null>(null);
  const [reportingSickDate, setReportingSickDate] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  if (columns !== prevColumns) {
    setPrevColumns(columns);
    setColumnsState(columns);
  }

  function handleDragStart(event: DragStartEvent) {
    const job = event.active.data.current?.job as PlanningJob | undefined;
    setActiveJob(job ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null);
    const { active, over } = event;
    if (!over) return;

    const targetDate = over.id as string;
    const sourceColumn = columnsState.find((c) => c.jobs.some((j) => j.id === active.id));
    const targetColumn = columnsState.find((c) => c.date === targetDate);
    if (!sourceColumn || !targetColumn) return;
    if (sourceColumn.date === targetColumn.date) return;

    const job = sourceColumn.jobs.find((j) => j.id === active.id);
    if (!job || job.locked) return;

    const position = targetColumn.jobs.length;
    const previousColumns = columnsState;

    setColumnsState((prev) =>
      prev.map((col) => {
        if (col.date === sourceColumn.date) {
          return { ...col, jobs: col.jobs.filter((j) => j.id !== job.id) };
        }
        if (col.date === targetColumn.date) {
          return { ...col, jobs: [...col.jobs, { ...job, routeId: targetColumn.routeId }] };
        }
        return col;
      }),
    );

    const result = await moveJobAction({
      jobId: job.id,
      employeeId: targetColumn.employeeId,
      targetDate: targetColumn.date,
      position,
    });

    if (!result.success) {
      setColumnsState(previousColumns);
      toast.error(result.error.message);
      return;
    }

    toast.success(`Beurt verplaatst naar ${targetColumn.dayLabel}.`, {
      action: {
        label: 'Ongedaan maken',
        onClick: async () => {
          const undoResult = await moveJobAction({
            jobId: job.id,
            employeeId: sourceColumn.employeeId,
            targetDate: sourceColumn.date,
            position: sourceColumn.jobs.length,
          });
          if (!undoResult.success) {
            toast.error(undoResult.error.message);
          }
        },
      },
    });
  }

  async function handleOptimize(column: WeekColumn) {
    setOptimizingDate(column.date);
    const result = await optimizeEmployeeDayAction({
      employeeId: column.employeeId,
      date: column.date,
    });
    setOptimizingDate(null);

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

  async function handleReportSick(column: WeekColumn) {
    setReportingSickDate(column.date);
    const result = await reportSickLeaveAction({
      employeeId: column.employeeId,
      date: column.date,
    });
    setReportingSickDate(null);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    if (result.data.proposal_id) {
      toast.success(
        `${column.employeeName} ziek gemeld — herplanvoorstel staat klaar op "Vandaag".`,
      );
    } else {
      toast(
        `${column.employeeName} ziek gemeld — geen beurten om te herverdelen op ${column.dayLabel}.`,
      );
    }
  }

  return (
    <DndContext
      id="week-board"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columnsState.map((column) => (
          <DayColumn
            key={column.date}
            column={column}
            isOptimizing={optimizingDate === column.date}
            onOptimize={() => handleOptimize(column)}
            isReportingSick={reportingSickDate === column.date}
            onReportSick={() => handleReportSick(column)}
            onOpenDetails={onOpenRouteDetails ? () => onOpenRouteDetails(column.date) : undefined}
          />
        ))}
      </div>
      <DragOverlay>{activeJob ? <JobCard job={activeJob} isDragging /> : null}</DragOverlay>
    </DndContext>
  );
}
