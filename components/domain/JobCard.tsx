import { Anchor } from 'lucide-react';

import { StatusBadge } from '@/components/domain/StatusBadge';
import { JOB_STATUS_LABEL, JOB_STATUS_TONE } from '@/lib/labels';
import { formatClockTime } from '@/lib/planning/dates';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database.types';

import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import type { ReactNode } from 'react';

export interface PlanningJob {
  id: string;
  status: Database['public']['Enums']['job_status'];
  locked: boolean;
  routeId: string | null;
  scheduledDate: string;
  sequence: number | null;
  arrivalTime: string | null;
  serviceStart: string | null;
  serviceEnd: string | null;
  estimatedDurationMinutes: number;
  driveTimeFromPrevSec: number | null;
  distanceFromPrevM: number | null;
  customerName: string;
  addressLine: string;
  city: string;
  serviceName: string;
}

interface JobCardProps {
  job: PlanningJob;
  /** dnd-kit koppelt hier ref/attributes/listeners voor het sleepbare element (26 § 4: "sleepbaar tenzij locked"). */
  dragHandleRef?: (element: HTMLElement | null) => void;
  dragAttributes?: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners;
  isDragging?: boolean;
  /** Tijdelijke achtergrond-puls bij een realtime-wijziging door een collega (42_DesignSystem.md § 15). */
  highlighted?: boolean;
  onClick?: () => void;
  action?: ReactNode;
  className?: string;
}

/**
 * JobCard — 26_ComponentLibrary.md § 4, 42_DesignSystem.md § 13. Vaste scan-volgorde
 * (tijd → klantnaam → adres/dienst → status): elke kaart wordt op dezelfde plek
 * gelezen, essentieel bij 10+ kaarten per RouteBoard-kolom (42 § 12.2).
 */
export function JobCard({
  job,
  dragHandleRef,
  dragAttributes,
  dragListeners,
  isDragging,
  highlighted,
  onClick,
  action,
  className,
}: JobCardProps) {
  return (
    <div
      ref={dragHandleRef}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'border-border bg-surface rounded-md border p-3 text-left shadow-sm transition-colors duration-500',
        onClick && 'cursor-pointer',
        isDragging && 'rotate-1 opacity-95 shadow-md',
        highlighted && 'bg-primary/10',
        className,
      )}
      {...(job.locked ? {} : dragAttributes)}
      {...(job.locked ? {} : dragListeners)}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-text flex items-center gap-1.5 text-sm font-medium tabular-nums">
          {job.locked ? <Anchor className="text-text-muted size-3.5" aria-hidden /> : null}
          {formatClockTime(job.arrivalTime)}
        </span>
        <StatusBadge label={JOB_STATUS_LABEL[job.status]} tone={JOB_STATUS_TONE[job.status]} />
      </div>
      <p className="text-text mt-1 text-sm font-medium">{job.customerName}</p>
      <p className="text-text-muted text-xs">
        {job.addressLine}, {job.city}
      </p>
      <p className="text-text-muted text-xs">
        {job.serviceName} · {job.estimatedDurationMinutes} min
      </p>
      {action}
    </div>
  );
}
