import { Car } from 'lucide-react';

import type { PlanningJob } from '@/components/domain/JobCard';
import { EmptyState } from '@/components/primitives/empty-state';
import { formatClockTime } from '@/lib/planning/dates';
import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

interface RouteStopListProps {
  stops: PlanningJob[];
  className?: string;
  /** Optionele actie per stop (bv. werkbon-link in het route-details-paneel). */
  renderStopAction?: (stop: PlanningJob) => ReactNode;
}

function formatDriveTime(seconds: number | null): string {
  if (seconds === null) return '—';
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

/**
 * RouteStopList — 26_ComponentLibrary.md § 4, 14_RoutingEngine.md § 4.4,
 * 42_DesignSystem.md § 16. Geordende stops (op `sequence`) met rijtijd-vanaf-vorige
 * en verwachte service-tijden, gebruikt in het route-details-paneel.
 */
export function RouteStopList({ stops, className, renderStopAction }: RouteStopListProps) {
  if (stops.length === 0) {
    return <EmptyState title="Geen stops op deze route." />;
  }

  const ordered = [...stops].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

  return (
    <ol className={cn('divide-border divide-y', className)}>
      {ordered.map((stop) => (
        <li key={stop.id} className="flex items-start gap-3 py-3">
          <span className="bg-surface text-text-muted flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums">
            {stop.sequence ?? '—'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-text truncate text-sm font-medium">{stop.customerName}</p>
            <p className="text-text-muted truncate text-xs">
              {stop.addressLine}, {stop.city}
            </p>
            <p className="text-text-muted mt-0.5 flex items-center gap-1 text-xs tabular-nums">
              <Car className="size-3.5" aria-hidden />
              {formatDriveTime(stop.driveTimeFromPrevSec)} rijden
            </p>
            {renderStopAction ? renderStopAction(stop) : null}
          </div>
          <div className="shrink-0 text-right text-xs tabular-nums">
            <p className="text-text font-medium">{formatClockTime(stop.serviceStart)}</p>
            <p className="text-text-muted">tot {formatClockTime(stop.serviceEnd)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
